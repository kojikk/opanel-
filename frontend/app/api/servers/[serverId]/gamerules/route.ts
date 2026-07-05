import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchGamerules, findUnknownGameruleKeys } from "@/lib/rcon/gamerules-fetch";
import { executeCommand } from "@/lib/server-manager";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serverId } = await params;
  try {
    const { rules, failed } = await fetchGamerules((command) => executeCommand(serverId, command));
    return NextResponse.json({ rules, failed });
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

  const unknownKeys = findUnknownGameruleKeys(Object.keys(body));
  if (unknownKeys.length > 0) {
    return NextResponse.json(
      { error: `Unknown gamerules: ${unknownKeys.join(", ")}`, unknownKeys },
      { status: 400 }
    );
  }

  try {
    const results: Record<string, string> = {};
    for (const [rule, value] of Object.entries(body)) {
      const response = await executeCommand(serverId, `gamerule ${rule} ${value}`);
      results[rule] = response;
    }
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
