/**
 * Parse TPS value from RCON `tps` command response.
 * Handles Paper/Spigot format with color codes: "§aTPS from last 1m, 5m, 15m: §a*20.0, §a*20.0, §a*20.0"
 */
export function parseTps(response: string): number {
  const cleaned = response.replace(/§[0-9a-fk-or]/gi, "").replace(/\*/g, "");
  const colonIdx = cleaned.indexOf(":");
  const afterColon = colonIdx >= 0 ? cleaned.slice(colonIdx + 1) : cleaned;
  const match = afterColon.match(/(\d+(?:\.\d+)?)/g);
  if (match && match.length > 0) return Math.min(parseFloat(match[0]), 20);
  return 20;
}

/**
 * Parse MSPT value from RCON `mspt` command response.
 * Paper format: "Server tick times (avg/min/max) from last 5s, 10s, 60s: §a25.3/22.1/30.5ms"
 */
export function parseMspt(response: string): number {
  const cleaned = response.replace(/§[0-9a-fk-or]/gi, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*ms/i);
  if (match) return parseFloat(match[1]);
  return 0;
}

/**
 * Parse player list from RCON `list` command response.
 * Format: "There are X of a max of Y players online: player1, player2, ..."
 */
export function parsePlayerList(response: string): { online: number; max: number; players: string[] } {
  const match = response.match(/There are (\d+) of a max of (\d+) players online:(.*)/);
  const online = match ? parseInt(match[1]) : 0;
  const max = match ? parseInt(match[2]) : 0;
  const players = match && match[3]
    ? match[3].split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  return { online, max, players };
}
