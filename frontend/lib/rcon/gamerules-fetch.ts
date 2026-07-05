export const KNOWN_GAMERULES = [
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
] as const;

const KNOWN_GAMERULES_SET = new Set<string>(KNOWN_GAMERULES);

export interface GamerulesFetchResult {
  /** Successfully read gamerule values. */
  rules: Record<string, string>;
  /** Rules that failed to fetch even after a retry (transient RCON errors). */
  failed: string[];
}

/**
 * Extract the value from a `gamerule <name>` reply.
 * Vanilla: "Gamerule doDaylightCycle is currently set to: true"
 * Some servers: "doDaylightCycle has value: true"
 * Returns null for anything else (no broad `: (.+)` fallback — that used to
 * swallow error messages as values).
 */
export function parseGameruleValue(response: string): string | null {
  const match = response.match(/is currently set to:\s*(.+)\s*$/i)
    || response.match(/has value:?\s*(.+)\s*$/i);
  return match ? match[1].trim() : null;
}

/** Reply that clearly means the rule/command does not exist on this server version. */
export function isUnknownGameruleReply(response: string): boolean {
  return /unknown\s+(?:game\s?rule|command)|incorrect argument|no game rule called/i.test(response);
}

/** Returns keys not present in KNOWN_GAMERULES (empty array = all valid). */
export function findUnknownGameruleKeys(keys: string[]): string[] {
  return keys.filter((key) => !KNOWN_GAMERULES_SET.has(key));
}

/**
 * Fetch all known gamerules with bounded parallelism and one retry per rule.
 * Outcomes per rule:
 *  - parseable reply → included in `rules`
 *  - "unknown gamerule/command" reply → omitted (genuinely unsupported)
 *  - other failure after one retry → listed in `failed`
 */
export async function fetchGamerules(
  exec: (command: string) => Promise<string>,
  ruleNames: readonly string[] = KNOWN_GAMERULES,
  concurrency = 8
): Promise<GamerulesFetchResult> {
  const rules: Record<string, string> = {};
  const failed: string[] = [];
  let nextIndex = 0;

  const fetchOne = async (rule: string): Promise<void> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await exec(`gamerule ${rule}`);
        if (isUnknownGameruleReply(response)) {
          return; // rule doesn't exist in this MC version — omit silently
        }
        const value = parseGameruleValue(response);
        if (value !== null) {
          rules[rule] = value;
          return;
        }
        // Unparseable reply — treat like a transient failure, retry once.
      } catch {
        // Transient RCON error — retry once.
      }
    }
    failed.push(rule);
  };

  const workers = Array.from({ length: Math.min(concurrency, ruleNames.length) }, async () => {
    while (nextIndex < ruleNames.length) {
      const rule = ruleNames[nextIndex++];
      await fetchOne(rule);
    }
  });

  await Promise.all(workers);
  return { rules, failed };
}
