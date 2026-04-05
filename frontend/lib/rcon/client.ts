import { Rcon } from "rcon-client";

interface RconPoolEntry {
  rcon: Rcon;
  lastUsed: number;
}

const pool = new Map<string, RconPoolEntry>();
const IDLE_TIMEOUT = 60_000;

function poolKey(host: string, port: number) {
  return `${host}:${port}`;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pool) {
    if (now - entry.lastUsed > IDLE_TIMEOUT) {
      entry.rcon.end().catch(() => {});
      pool.delete(key);
    }
  }
}, 30_000);

export async function getRcon(host: string, port: number, password: string): Promise<Rcon> {
  const key = poolKey(host, port);
  const existing = pool.get(key);

  if (existing) {
    existing.lastUsed = Date.now();
    try {
      await existing.rcon.send("list");
      return existing.rcon;
    } catch {
      pool.delete(key);
      existing.rcon.end().catch(() => {});
    }
  }

  const rcon = await Rcon.connect({
    host,
    port,
    password,
    timeout: 5000,
  });

  pool.set(key, { rcon, lastUsed: Date.now() });
  return rcon;
}

export async function sendCommand(host: string, port: number, password: string, command: string): Promise<string> {
  const rcon = await getRcon(host, port, password);
  return rcon.send(command);
}

export async function disconnectAll(): Promise<void> {
  for (const [key, entry] of pool) {
    await entry.rcon.end().catch(() => {});
    pool.delete(key);
  }
}
