import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { parsePlayerList } from "@/lib/rcon/parsers";
import { executeCommand } from "@/lib/server-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.PLAYERS_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeCommand(serverId, "list");
    return NextResponse.json(parsePlayerList(result));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  const body = await request.json();
  const { action, player, reason, mode } = body;

  const actionPermissions: Record<string, string> = {
    kick: P.PLAYERS_KICK,
    ban: P.PLAYERS_BAN,
    pardon: P.PLAYERS_BAN,
    op: P.PLAYERS_OP,
    deop: P.PLAYERS_OP,
    gamemode: P.PLAYERS_GAMEMODE,
  };

  const permission = actionPermissions[action];
  if (!permission) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    await requirePermission(request, serverId, permission);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
