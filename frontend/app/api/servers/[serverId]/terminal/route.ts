import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executeCommand, getServer } from "@/lib/server-manager";
import { getContainerLogs } from "@/lib/docker/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const server = await getServer(serverId);
  if (!server?.containerId) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const logStream = await getContainerLogs(server.containerId!, 200) as unknown as import("stream").Readable;

        logStream.on("data", (chunk: Buffer) => {
          const lines = chunk.toString("utf-8").split("\n").filter(Boolean);
          for (const line of lines) {
            const cleaned = line.length > 8 ? line.slice(8) : line;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "log", message: cleaned })}\n\n`));
          }
        });

        logStream.on("end", () => {
          controller.close();
        });

        logStream.on("error", () => {
          controller.close();
        });

        request.signal.addEventListener("abort", () => {
          logStream.destroy();
          controller.close();
        });
      } catch {
        controller.close();
      }
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const { command } = await request.json();

  if (!command) {
    return NextResponse.json({ error: "Command required" }, { status: 400 });
  }

  try {
    const result = await executeCommand(serverId, command);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
