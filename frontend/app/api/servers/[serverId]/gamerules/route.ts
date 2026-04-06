import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePermission, P } from "@/lib/auth";
import { executeCommand } from "@/lib/server-manager";

/** Canonical gamerule names in camelCase (used as display keys) */
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

/** Convert camelCase to snake_case */
function toSnakeCase(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => "_" + ch.toLowerCase());
}

/** Extract the value from a gamerule query response */
function parseGameruleValue(response: string): string | null {
  // "Gamerule X is currently set to: VALUE"
  let match = response.match(/is currently set to:\s*(.+)/i);
  if (match) return match[1].trim();

  // "has value: VALUE" or "is: VALUE"
  match = response.match(/(?:has value|is)\s*:\s*(.+)/i);
  if (match) return match[1].trim();

  // "X = VALUE"
  match = response.match(/=\s*(.+)/);
  if (match) return match[1].trim();

  // Plain value
  const trimmed = response.trim();
  if (/^(true|false|-?\d+)$/.test(trimmed)) return trimmed;

  return null;
}

/** Detect whether this server uses snake_case or camelCase gamerule names */
async function detectNamingFormat(serverId: string): Promise<"snake" | "camel"> {
  // Test with keepInventory (exists in all MC versions with gamerules)
  try {
    const res = await executeCommand(serverId, "gamerule keep_inventory");
    if (!res.includes("Incorrect") && !res.includes("Unknown")) return "snake";
  } catch { /* ignore */ }

  return "camel";
}

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
    // Test RCON connection first
    try {
      await executeCommand(serverId, "list");
    } catch {
      return NextResponse.json(
        { error: "Cannot connect to server. Make sure the server is running." },
        { status: 503 }
      );
    }

    const format = await detectNamingFormat(serverId);
    const results: Record<string, string> = {};

    for (const rule of KNOWN_GAMERULES) {
      const rconName = format === "snake" ? toSnakeCase(rule) : rule;
      try {
        const response = await executeCommand(serverId, `gamerule ${rconName}`);
        const value = parseGameruleValue(response);
        if (value !== null) {
          // Store with the RCON name (what the server actually uses)
          results[rconName] = value;
        }
      } catch {
        // Rule may not exist in this MC version — skip
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
