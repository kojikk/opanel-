import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db/client";
import { sendCommand } from "@/lib/rcon/client";
import {
  CONTAINER_PREFIX,
  createServerContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerStatus,
  getContainerStats,
  isDockerAvailable,
  listPanelContainers,
  pullImage,
  type ContainerStats,
} from "@/lib/docker/client";

const SERVERS_BASE_PATH = process.env.SERVERS_BASE_PATH || "./servers";
const OPANEL_PLUGIN_JAR = process.env.OPANEL_PLUGIN_JAR_PATH || "";

function sanitizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

async function installPlugin(dataPath: string): Promise<boolean> {
  if (!OPANEL_PLUGIN_JAR) return false;
  try {
    const pluginsDir = path.join(dataPath, "plugins");
    fs.mkdirSync(pluginsDir, { recursive: true });
    const dest = path.join(pluginsDir, path.basename(OPANEL_PLUGIN_JAR));
    fs.copyFileSync(OPANEL_PLUGIN_JAR, dest);
    return true;
  } catch {
    return false;
  }
}

export interface ServerInfo {
  id: string;
  name: string;
  description: string | null;
  type: string;
  mcVersion: string;
  gamePort: number;
  rconPort: number;
  pluginPort: number;
  memory: string;
  cpus: number | null;
  javaVersion: string;
  autoStart: boolean;
  pluginInstalled: boolean;
  status: string;
  createdAt: Date;
}

export interface ReconcileResult {
  /** DB rows whose containerId is not present in Docker */
  missingContainers: { id: string; name: string; containerName: string; containerId: string | null }[];
  /** Docker containers matching the panel naming convention with no DB row */
  orphanContainers: { id: string; name: string }[];
}

export async function createServer(opts: {
  name: string;
  description?: string;
  type: string;
  mcVersion: string;
  memory?: string;
  cpus?: number;
  javaVersion?: string;
  gamePort: number;
  rconPort: number;
  pluginPort?: number;
  autoStart?: boolean;
}): Promise<ServerInfo> {
  if (!(await isDockerAvailable())) {
    throw new Error("Docker is not available. Make sure Docker is running.");
  }

  const rconPassword = crypto.randomBytes(16).toString("hex");
  const pluginPort = opts.pluginPort || 3000 + Math.floor(Math.random() * 1000);
  const dataPath = path.resolve(SERVERS_BASE_PATH, sanitizeName(opts.name));
  const javaVersion = opts.javaVersion || "21";
  const memory = opts.memory || "2G";

  // 1. Pre-check port uniqueness before touching anything.
  const requestedPorts = [opts.gamePort, opts.rconPort, pluginPort];
  const conflict = await prisma.server.findFirst({
    where: {
      OR: [
        { gamePort: { in: requestedPorts } },
        { rconPort: { in: requestedPorts } },
        { pluginPort: { in: requestedPorts } },
      ],
    },
  });
  if (conflict) {
    throw new Error(
      `Port conflict: server "${conflict.name}" already uses one of the requested ports ` +
        `(game=${opts.gamePort}, rcon=${opts.rconPort}, plugin=${pluginPort})`
    );
  }

  // 2. Create the DB row first so a crash mid-provisioning is visible
  //    (provisionStatus stays "creating") instead of leaving an orphan container.
  const row = await prisma.server.create({
    data: {
      name: opts.name,
      description: opts.description,
      type: opts.type,
      mcVersion: opts.mcVersion,
      containerId: null,
      containerName: `${CONTAINER_PREFIX}${sanitizeName(opts.name)}`,
      rconPort: opts.rconPort,
      rconPassword,
      gamePort: opts.gamePort,
      pluginPort,
      memory,
      cpus: opts.cpus ?? null,
      javaVersion,
      dataPath,
      autoStart: opts.autoStart ?? false,
      pluginInstalled: false,
      provisionStatus: "creating",
    },
  });

  // 3. Provision with compensation: a failed create leaves NOTHING behind.
  const dirExistedBefore = fs.existsSync(dataPath);
  let containerId: string | null = null;
  try {
    fs.mkdirSync(dataPath, { recursive: true });

    await pullImage();

    const pluginInstalled = await installPlugin(dataPath);

    containerId = await createServerContainer({
      name: opts.name,
      type: opts.type,
      mcVersion: opts.mcVersion,
      memory,
      gamePort: opts.gamePort,
      rconPort: opts.rconPort,
      rconPassword,
      pluginPort,
      dataPath,
      javaVersion,
      cpus: opts.cpus,
    });

    await prisma.server.update({
      where: { id: row.id },
      data: { containerId, pluginInstalled },
    });

    await startContainer(containerId);

    // 4. Provisioning finished — mark ready.
    const server = await prisma.server.update({
      where: { id: row.id },
      data: { provisionStatus: "ready" },
    });

    return toServerInfo(server, "running");
  } catch (err) {
    // Compensation: best-effort cleanup, then surface the original error.
    if (containerId) {
      try {
        await removeContainer(containerId);
      } catch {
        // best effort
      }
    }
    if (!dirExistedBefore) {
      try {
        fs.rmSync(dataPath, { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
    try {
      await prisma.server.delete({ where: { id: row.id } });
    } catch {
      // best effort
    }
    throw err;
  }
}

/**
 * Compare Prisma rows against Docker containers matching the panel's naming
 * convention. Read-only: never deletes or mutates anything.
 */
export async function reconcileServers(): Promise<ReconcileResult> {
  const [rows, containers] = await Promise.all([
    prisma.server.findMany(),
    listPanelContainers(),
  ]);

  const dockerIds = new Set(containers.map((c) => c.id));
  const rowContainerIds = new Set(rows.map((r) => r.containerId).filter(Boolean) as string[]);
  const rowContainerNames = new Set(rows.map((r) => r.containerName));

  const missingContainers = rows
    .filter((r) => !r.containerId || !dockerIds.has(r.containerId))
    .map((r) => ({ id: r.id, name: r.name, containerName: r.containerName, containerId: r.containerId }));

  const orphanContainers = containers
    .filter((c) => !rowContainerIds.has(c.id) && !rowContainerNames.has(c.name))
    .map((c) => ({ id: c.id, name: c.name }));

  return { missingContainers, orphanContainers };
}

/**
 * Display status for a server row. Runtime status comes from Docker;
 * "creating" (interrupted provisioning) and "missing" (row exists but the
 * container is gone from Docker) are derived here.
 */
async function resolveStatus(s: { containerId: string | null; provisionStatus?: string }): Promise<string> {
  if (s.provisionStatus === "creating") return "creating";
  if (!s.containerId) return "missing";
  const status = await getContainerStatus(s.containerId);
  return status === "unknown" ? "missing" : status;
}

export async function listServers(): Promise<ServerInfo[]> {
  const servers = await prisma.server.findMany({ orderBy: { createdAt: "desc" } });
  return Promise.all(servers.map(async (s) => toServerInfo(s, await resolveStatus(s))));
}

export async function getServer(serverId: string) {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) return null;
  return {
    ...server,
    status: await resolveStatus(server),
  };
}

export async function startServer(serverId: string): Promise<void> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.containerId) throw new Error("Server not found");
  await startContainer(server.containerId);
}

export async function stopServer(serverId: string): Promise<void> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.containerId) throw new Error("Server not found");
  await stopContainer(server.containerId);
}

export async function restartServer(serverId: string): Promise<void> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.containerId) throw new Error("Server not found");
  await restartContainer(server.containerId);
}

export async function deleteServer(serverId: string): Promise<void> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) throw new Error("Server not found");
  if (server.containerId) {
    await removeContainer(server.containerId);
  }
  await prisma.server.delete({ where: { id: serverId } });
}

export async function getServerStats(serverId: string): Promise<ContainerStats | null> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server?.containerId) return null;
  return getContainerStats(server.containerId);
}

export async function executeCommand(serverId: string, command: string): Promise<string> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) throw new Error("Server not found");
  return sendCommand("localhost", server.rconPort, server.rconPassword, command);
}

function toServerInfo(
  s: { id: string; name: string; description: string | null; type: string; mcVersion: string; gamePort: number; rconPort: number; pluginPort: number; memory: string; cpus: number | null; javaVersion: string; autoStart: boolean; pluginInstalled: boolean; createdAt: Date },
  status: string
): ServerInfo {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    type: s.type,
    mcVersion: s.mcVersion,
    gamePort: s.gamePort,
    rconPort: s.rconPort,
    pluginPort: s.pluginPort,
    memory: s.memory,
    cpus: s.cpus,
    javaVersion: s.javaVersion,
    autoStart: s.autoStart,
    pluginInstalled: s.pluginInstalled,
    status,
    createdAt: s.createdAt,
  };
}
