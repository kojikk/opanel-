import Docker from "dockerode";

const docker = new Docker(
  process.platform === "win32"
    ? { socketPath: "//./pipe/docker_engine" }
    : { socketPath: "/var/run/docker.sock" }
);

export const MC_IMAGE = "itzg/minecraft-server";
export const CONTAINER_PREFIX = "opanel-mc-";

export interface CreateServerOptions {
  name: string;
  type: string;
  mcVersion: string;
  memory: string;
  gamePort: number;
  rconPort: number;
  rconPassword: string;
  pluginPort: number;
  dataPath: string;
  javaVersion?: string;
  /** Optional CPU limit (number of CPUs, e.g. 1.5). Translated to NanoCpus. */
  cpus?: number;
}

const GIB = 1024 * 1024 * 1024;
const MIB = 1024 * 1024;

/**
 * Derive the container memory limit (bytes) from the itzg MEMORY value (JVM heap).
 * Accepts the itzg-accepted format: "<n>M" or "<n>G" (e.g. "512M", "2G", "16G").
 * Container limit = heap + max(1 GiB, 50% of heap) to leave headroom for
 * JVM off-heap memory (metaspace, threads, native buffers).
 */
export function deriveContainerMemoryBytes(memory: string): number {
  const match = /^(\d+)([MmGg])$/.exec(memory.trim());
  if (!match) {
    throw new Error(`Unparseable memory value: "${memory}" (expected e.g. "512M" or "2G")`);
  }
  const amount = parseInt(match[1], 10);
  if (amount <= 0) {
    throw new Error(`Unparseable memory value: "${memory}" (must be positive)`);
  }
  const heapBytes = amount * (match[2].toUpperCase() === "G" ? GIB : MIB);
  const overheadBytes = Math.max(GIB, Math.floor(heapBytes / 2));
  return heapBytes + overheadBytes;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
}

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

export async function createServerContainer(opts: CreateServerOptions): Promise<string> {
  const containerName = `${CONTAINER_PREFIX}${opts.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;

  const env = [
    "EULA=TRUE",
    `TYPE=${opts.type.toUpperCase()}`,
    `VERSION=${opts.mcVersion}`,
    `MEMORY=${opts.memory}`,
    `RCON_PASSWORD=${opts.rconPassword}`,
    "ENABLE_RCON=true",
    "RCON_PORT=25575",
  ];

  if (opts.javaVersion) {
    env.push(`JAVA_VERSION=java${opts.javaVersion}`);
  }

  const memoryBytes = deriveContainerMemoryBytes(opts.memory);

  const container = await docker.createContainer({
    Image: MC_IMAGE,
    name: containerName,
    Env: env,
    ExposedPorts: {
      "25565/tcp": {},
      "25575/tcp": {},
      [`${opts.pluginPort}/tcp`]: {},
    },
    HostConfig: {
      // Hard memory limit: JVM heap + off-heap headroom. MemorySwap equal to
      // Memory means the container gets no swap.
      Memory: memoryBytes,
      MemorySwap: memoryBytes,
      ...(opts.cpus ? { NanoCpus: Math.round(opts.cpus * 1e9) } : {}),
      PortBindings: {
        "25565/tcp": [{ HostPort: String(opts.gamePort) }],
        // RCON: loopback only — password travels plaintext; only the panel (localhost) uses it
        "25575/tcp": [{ HostIp: "127.0.0.1", HostPort: String(opts.rconPort) }],
        // Plugin API: loopback only — unauthenticated; only the panel (localhost) calls it
        [`${opts.pluginPort}/tcp`]: [{ HostIp: "127.0.0.1", HostPort: String(opts.pluginPort) }],
      },
      Binds: [`${opts.dataPath}:/data`],
      RestartPolicy: { Name: "unless-stopped" },
    },
  });

  return container.id;
}

export async function startContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.start();
}

export async function stopContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.stop({ t: 30 });
}

export async function restartContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.restart({ t: 30 });
}

function isNotFound(err: unknown): boolean {
  return (err as { statusCode?: number })?.statusCode === 404;
}

export async function removeContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  try {
    await container.stop({ t: 10 });
  } catch {
    // already stopped or already gone (404)
  }
  try {
    await container.remove({ force: true });
  } catch (err) {
    // Container already gone (e.g. manually removed) — treat as success so
    // deletion can proceed. Anything else is a real failure.
    if (!isNotFound(err)) throw err;
  }
}

export async function getContainerStatus(containerId: string): Promise<string> {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.State.Status;
  } catch {
    return "unknown";
  }
}

export async function getContainerStats(containerId: string): Promise<ContainerStats> {
  const container = docker.getContainer(containerId);
  const stats = await container.stats({ stream: false });

  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numCpus = stats.cpu_stats.online_cpus || 1;
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

  const memUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
  const memLimit = stats.memory_stats.limit;

  return {
    cpuPercent: Math.round(cpuPercent * 100) / 100,
    memoryUsageMB: Math.round(memUsage / 1024 / 1024),
    memoryLimitMB: Math.round(memLimit / 1024 / 1024),
    memoryPercent: Math.round((memUsage / memLimit) * 10000) / 100,
  };
}

export function getContainerLogs(containerId: string, tail: number = 100) {
  const container = docker.getContainer(containerId);
  return container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });
}

export interface PanelContainerInfo {
  id: string;
  name: string;
}

/**
 * List all containers (running or not) whose name matches the panel's
 * container-name convention (CONTAINER_PREFIX).
 */
export async function listPanelContainers(): Promise<PanelContainerInfo[]> {
  const containers = await docker.listContainers({ all: true });
  const result: PanelContainerInfo[] = [];
  for (const c of containers) {
    // Docker reports names with a leading slash
    const name = (c.Names || []).map((n) => n.replace(/^\//, "")).find((n) => n.startsWith(CONTAINER_PREFIX));
    if (name) result.push({ id: c.Id, name });
  }
  return result;
}

export async function pullImage(): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.pull(MC_IMAGE, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

/**
 * Wait for RCON to become available by polling Docker container logs
 * for the "RCON running" message from itzg/minecraft-server.
 */
export async function waitForRcon(containerId: string, timeoutMs: number = 120_000): Promise<boolean> {
  const start = Date.now();
  const container = docker.getContainer(containerId);

  while (Date.now() - start < timeoutMs) {
    try {
      const logBuffer = await container.logs({
        stdout: true,
        stderr: true,
        tail: 50,
      });
      const logText = logBuffer.toString("utf-8");
      if (logText.includes("RCON running")) return true;
    } catch {
      // container might not be ready yet
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  return false;
}

export default docker;
