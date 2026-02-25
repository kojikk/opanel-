import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executeCommand } from "@/lib/server-manager";
import { readServerFile } from "@/lib/file-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

  try {
    const content = await readServerFile(serverId, "whitelist.json");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  const body = await request.json();
  const { action, player } = body;

  const commands: Record<string, string> = {
    enable: "whitelist on",
    disable: "whitelist off",
    add: `whitelist add ${player}`,
    remove: `whitelist remove ${player}`,
    reload: "whitelist reload",
  };

  const command = commands[action];
  if (!command) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result = await executeCommand(serverId, command);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
