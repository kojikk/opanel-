import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import WebSocket from "ws";
import { requireAuth } from "@/lib/auth";
import { getServer } from "@/lib/server-manager";
import { derivePluginSecret, mintPluginToken } from "@/lib/plugin-token";

/**
 * Panel-side bridge to the plugin's /socket/inventory/{uuid} WebSocket.
 *
 * The plugin port is bound to 127.0.0.1 on the host, so the browser can never
 * reach it directly — and Next.js App Router route handlers cannot terminate
 * WebSocket upgrades. Instead (matching the terminal page's SSE pattern):
 *
 *  - GET  = SSE downstream: the Next server process opens a ws client to the
 *    plugin (authenticated with a panel-minted short-lived token) and forwards
 *    init/update packets as SSE events until either side disconnects.
 *  - POST = one-shot upstream: opens a short-lived ws, sends one update packet,
 *    awaits the echoed update (or an error/timeout), closes. Stateless by
 *    design — no cross-request connection registry to leak or synchronize.
 */

const UPDATE_TIMEOUT_MS = 5000;

async function resolvePluginTarget(serverId: string, uuid: string) {
  const server = await getServer(serverId);
  if (!server) {
    return { error: NextResponse.json({ error: "Server not found" }, { status: 404 }) };
  }
  if (!server.pluginInstalled) {
    return { error: NextResponse.json({ error: "Plugin not installed on this server" }, { status: 409 }) };
  }
  if (server.status !== "running") {
    return { error: NextResponse.json({ error: "Server is not running" }, { status: 409 }) };
  }
  const token = mintPluginToken(derivePluginSecret(server.rconPassword));
  const url = `ws://127.0.0.1:${server.pluginPort}/socket/inventory/${encodeURIComponent(uuid)}?token=${encodeURIComponent(token)}`;
  return { url };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; uuid: string }> }
) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId, uuid } = await params;
  const target = await resolvePluginTarget(serverId, uuid);
  if ("error" in target) return target.error;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const socket = new WebSocket(target.url!);
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        try { socket.close(); } catch { /* already closed */ }
        try { controller.close(); } catch { /* already closed */ }
      };

      socket.on("open", () => {
        // The plugin sends its own "connect" packet; nothing to do here.
      });

      socket.on("message", (raw) => {
        try {
          const packet = JSON.parse(raw.toString());
          // Forward inventory packets; skip protocol chatter (connect/ping/pong).
          if (packet.type === "init" || packet.type === "update") {
            send(packet.type, packet.data);
          } else if (packet.type === "error") {
            send("error", { code: packet.data });
          }
        } catch {
          // Ignore unparseable frames.
        }
      });

      socket.on("close", (code, reason) => {
        send("closed", { code, reason: reason?.toString() ?? "" });
        cleanup();
      });

      socket.on("error", () => {
        send("error", { code: 502 });
        cleanup();
      });

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; uuid: string }> }
) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId, uuid } = await params;
  const item = await request.json().catch(() => null);
  if (!item || typeof item.slot !== "number") {
    return NextResponse.json({ error: "Invalid item payload" }, { status: 400 });
  }

  const target = await resolvePluginTarget(serverId, uuid);
  if ("error" in target) return target.error;

  // One-shot: connect, send the update, await the echoed inventory, close.
  return new Promise<NextResponse>((resolve) => {
    const socket = new WebSocket(target.url!);
    let settled = false;

    const settle = (res: NextResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* already closed */ }
      resolve(res);
    };

    const timer = setTimeout(() => {
      settle(NextResponse.json({ error: "Plugin did not respond in time" }, { status: 504 }));
    }, UPDATE_TIMEOUT_MS);

    socket.on("open", () => {
      socket.send(JSON.stringify({ type: "update", data: item }));
    });

    socket.on("message", (raw) => {
      try {
        const packet = JSON.parse(raw.toString());
        if (packet.type === "update") {
          settle(NextResponse.json({ inventory: packet.data }));
        } else if (packet.type === "error") {
          settle(NextResponse.json({ error: "Plugin rejected the update", code: packet.data }, { status: 502 }));
        }
      } catch {
        // Ignore unparseable frames.
      }
    });

    socket.on("close", (code) => {
      settle(NextResponse.json({ error: `Plugin closed the connection (${code})` }, { status: 502 }));
    });

    socket.on("error", () => {
      settle(NextResponse.json({ error: "Failed to reach the plugin" }, { status: 502 }));
    });
  });
}
