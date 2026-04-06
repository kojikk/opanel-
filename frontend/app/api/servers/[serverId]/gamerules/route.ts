import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { executeCommand } from "@/lib/server-manager";

const KNOWN_GAMERULES = [
  "announceAdvancements", "blockExplosionDropDecay", "commandBlockOutput",
  "commandModificationBlockLimit", "disableElytraMovementCheck", "disableRaids",
  "doDaylightCycle", "doEntityDrops", "doFireTick", "doImmediateRespawn",
  "doInsomnia", "doLimitedCrafting", "doMobLoot", "doMobSpawning",
  "doPatrolSpawning", "doTileDrops", "doTraderSpawning", "doVinesSpread",
  "doWardenSpawning", "doWeatherCycle", "drowningDamage", "enderPearlsVanishOnDeath",
  "fallDamage", "fireDamage", "forgiveDeadPlayers", "freezeDamage",
  "globalSoundEvents", "keepInventory", "lavaSourceConversion", "logAdminCommands",
  "maxCommandChainLength", "maxCommandForkCount", "maxEntityCramming",
  "mobExplosionDropDecay", "mobGriefing", "naturalRegeneration",
  "playersNetherPortalCreativeDelay", "playersNetherPortalDefaultDelay",
  "playersSleepingPercentage", "projectilesCanBreakBlocks", "randomTickSpeed",
  "reducedDebugInfo", "sendCommandFeedback", "showDeathMessages",
  "snowAccumulationHeight", "spawnChunkRadius", "spawnRadius",
  "spectatorsGenerateChunks", "tntExplosionDropDecay", "universalAnger",
  "waterSourceConversion",
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.GAMERULES_VIEW);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results: Record<string, string> = {};

    for (const rule of KNOWN_GAMERULES) {
      try {
        const response = await executeCommand(serverId, `gamerule ${rule}`);
        const match = response.match(/(?:is currently set to|has value): (.+)/i)
          || response.match(/: (.+)$/);
        if (match) {
          results[rule] = match[1].trim();
        }
      } catch {
        // Rule may not exist in this MC version
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  try {
    await requirePermission(request, serverId, P.GAMERULES_EDIT);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

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
