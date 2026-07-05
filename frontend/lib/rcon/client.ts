import { Rcon } from "rcon-client";

interface RconConnectOptions {
  host: string;
  port: number;
  password: string;
  timeout: number;
}

type RconConnectFn = (options: RconConnectOptions) => Promise<Rcon>;

interface RconPoolEntry {
  /** Shared connection promise — set synchronously so concurrent callers reuse one connect. */
  connection: Promise<Rcon>;
  /** Populated once the connection resolves, so eviction can compare identities. */
  resolved: Rcon | null;
  lastUsed: number;
}

const pool = new Map<string, RconPoolEntry>();
const IDLE_TIMEOUT = 60_000;
const SWEEP_INTERVAL = 30_000;

const defaultConnect: RconConnectFn = (options) => Rcon.connect(options);
let connectFn: RconConnectFn = defaultConnect;

function poolKey(host: string, port: number) {
  return `${host}:${port}`;
}

function closeQuietly(rcon: Rcon) {
  try {
    void Promise.resolve(rcon.end()).catch(() => {});
  } catch {
    // ignore
  }
}

/** Remove an entry from the pool and close its connection (once resolved). */
function evictEntry(key: string, entry: RconPoolEntry) {
  if (pool.get(key) === entry) {
    pool.delete(key);
  }
  entry.connection.then(closeQuietly, () => {});
}

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pool) {
    if (now - entry.lastUsed > IDLE_TIMEOUT) {
      evictEntry(key, entry);
    }
  }
}, SWEEP_INTERVAL);
// Don't keep the process alive just for the sweep.
sweeper.unref?.();

export async function getRcon(host: string, port: number, password: string): Promise<Rcon> {
  const key = poolKey(host, port);
  const existing = pool.get(key);

  if (existing) {
    existing.lastUsed = Date.now();
    return existing.connection;
  }

  // Set the entry synchronously (before any await) so concurrent first-callers
  // share a single connect instead of racing and leaking sockets.
  const connection = connectFn({ host, port, password, timeout: 5000 });
  const entry: RconPoolEntry = { connection, resolved: null, lastUsed: Date.now() };
  pool.set(key, entry);

  connection.then(
    (rcon) => {
      if (pool.get(key) === entry) {
        entry.resolved = rcon;
      } else {
        // Entry was evicted while connecting — don't leak the socket.
        closeQuietly(rcon);
      }
    },
    () => {
      // Connect failed: clear the entry so the next call retries.
      if (pool.get(key) === entry) {
        pool.delete(key);
      }
    }
  );

  return connection;
}

/** Heuristic for connection-level failures (vs. command-level errors). */
function isConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|socket|not connected|connection (?:closed|lost|ended)|already ended|closed/i.test(
    message
  );
}

export async function sendCommand(host: string, port: number, password: string, command: string): Promise<string> {
  const key = poolKey(host, port);
  const entry0 = pool.get(key);
  const rcon = await getRcon(host, port, password);

  try {
    return await rcon.send(command);
  } catch (error) {
    if (!isConnectionError(error)) throw error;

    // Evict the dead connection (only if it's still the pooled one) and retry once.
    const current = pool.get(key) ?? entry0;
    if (current && current.resolved === rcon) {
      evictEntry(key, current);
    }
    const fresh = await getRcon(host, port, password);
    return fresh.send(command);
  }
}

export async function disconnectAll(): Promise<void> {
  const entries = [...pool.values()];
  pool.clear();
  await Promise.all(
    entries.map((entry) => entry.connection.then((rcon) => Promise.resolve(rcon.end()).catch(() => {})).catch(() => {}))
  );
}

/**
 * Test hook: override the connect function (pass null to restore the real one).
 * Also clears the pool so tests start from a clean slate.
 */
export function _setRconConnectForTests(fn: RconConnectFn | null): void {
  connectFn = fn ?? defaultConnect;
  pool.clear();
}
