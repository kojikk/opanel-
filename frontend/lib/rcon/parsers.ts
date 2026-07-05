/**
 * Parse TPS value from RCON `tps` command response.
 * Handles Paper/Spigot format with color codes: "§aTPS from last 1m, 5m, 15m: §a*20.0, §a*20.0, §a*20.0"
 * Returns null when the response is not recognizable as a TPS reading.
 */
export function parseTps(response: string): number | null {
  const cleaned = response.replace(/§[0-9a-fk-or]/gi, "").replace(/\*/g, "");
  const colonIdx = cleaned.indexOf(":");
  const afterColon = colonIdx >= 0 ? cleaned.slice(colonIdx + 1) : cleaned;
  const match = afterColon.match(/(\d+(?:\.\d+)?)/g);
  if (match && match.length > 0) return Math.min(parseFloat(match[0]), 20);
  return null;
}

/**
 * Parse MSPT value from RCON `mspt` command response.
 * Paper format: "Server tick times (avg/min/max) from last 5s, 10s, 60s: §a25.3/22.1/30.5ms"
 * Returns null when the response is not recognizable as an MSPT reading.
 */
export function parseMspt(response: string): number | null {
  const cleaned = response.replace(/§[0-9a-fk-or]/gi, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*ms/i);
  if (match) return parseFloat(match[1]);
  return null;
}

export interface PlayerListResult {
  online: number;
  max: number;
  players: string[];
}

/**
 * Parse player list from RCON `list` command response.
 * Format: "There are X of a max of Y players online: player1, player2, ..."
 * Returns null when the response does not match the known format
 * (instead of a fake empty-server reading).
 */
export function parsePlayerList(response: string): PlayerListResult | null {
  const match = response.match(/There are (\d+) of a max of (\d+) players online:(.*)/);
  if (!match) return null;
  const online = parseInt(match[1]);
  const max = parseInt(match[2]);
  const players = match[3]
    ? match[3].split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  return { online, max, players };
}
