import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parsePlayerList } from "@/lib/rcon/parsers";
import { executeCommand } from "@/lib/server-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;

  try {
    const result = await executeCommand(serverId, "list");
    return NextResponse.json(parsePlayerList(result));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
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
  const { action, player, reason, mode } = body;

  const commands: Record<string, string> = {
    kick: `kick ${player}${reason ? ` ${reason}` : ""}`,
    ban: `ban ${player}${reason ? ` ${reason}` : ""}`,
    pardon: `pardon ${player}`,
    op: `op ${player}`,
    deop: `deop ${player}`,
    gamemode: `gamemode ${mode} ${player}`,
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
