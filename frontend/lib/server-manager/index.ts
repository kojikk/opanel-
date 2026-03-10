import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db/client";
import { sendCommand } from "@/lib/rcon/client";
import {
  createServerContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerStatus,
  getContainerStats,
  isDockerAvailable,
  pullImage,
  type ContainerStats,
} from "@/lib/docker/client";

const SERVERS_BASE_PATH = process.env.SERVERS_BASE_PATH || "./servers";
const OPANEL_PLUGIN_JAR = process.env.OPANEL_PLUGIN_JAR_PATH || "";

export interface ProvisioningStatus {
  step: "queued" | "pulling" | "creating" | "starting" | "ready" | "error";
  progress: number; // 0-100
  message: string;
  error?: string;
}

const provisioningState = new Map<string, ProvisioningStatus>();

export function getProvisioningStatus(serverId: string): ProvisioningStatus | null {
  return provisioningState.get(serverId) ?? null;
}

function setProvisioning(serverId: string, step: ProvisioningStatus["step"], progress: number, message: string, error?: string) {
  provisioningState.set(serverId, { step, progress, message, error });
}

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
  javaVersion: string;
  autoStart: boolean;
  pluginInstalled: boolean;
  status: string;
  createdAt: Date;
}

export async function createServer(opts: {
  name: string;
  description?: string;
  type: string;
  mcVersion: string;
  memory?: string;
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

  fs.mkdirSync(dataPath, { recursive: true });

  // Create DB record immediately (no containerId yet)
  const server = await prisma.server.create({
    data: {
      name: opts.name,
      description: opts.description,
      type: opts.type,
      mcVersion: opts.mcVersion,
      containerName: `opanel-mc-${sanitizeName(opts.name)}`,
      rconPort: opts.rconPort,
      rconPassword,
      gamePort: opts.gamePort,
      pluginPort,
      memory: opts.memory || "2G",
      javaVersion,
      dataPath,
      autoStart: opts.autoStart ?? false,
      pluginInstalled: false,
    },
  });

  setProvisioning(server.id, "queued", 0, "Queued for setup...");

  // Do Docker work in background
  provisionServerAsync(server.id, {
    name: opts.name,
    type: opts.type,
    mcVersion: opts.mcVersion,
    memory: opts.memory || "2G",
    gamePort: opts.gamePort,
    rconPort: opts.rconPort,
    rconPassword,
    pluginPort,
    dataPath,
    javaVersion,
  });

  return toServerInfo(server, "provisioning");
}

async function provisionServerAsync(
  serverId: string,
  opts: {
    name: string; type: string; mcVersion: string; memory: string;
    gamePort: number; rconPort: number; rconPassword: string;
    pluginPort: number; dataPath: string; javaVersion: string;
  },
) {
  try {
    setProvisioning(serverId, "pulling", 20, "Pulling Docker image...");
    await pullImage();

    setProvisioning(serverId, "creating", 50, "Creating container...");
    const pluginInstalled = await installPlugin(opts.dataPath);

    const containerId = await createServerContainer({
      name: opts.name,
      type: opts.type,
      mcVersion: opts.mcVersion,
      memory: opts.memory,
      gamePort: opts.gamePort,
      rconPort: opts.rconPort,
      rconPassword: opts.rconPassword,
      pluginPort: opts.pluginPort,
      dataPath: opts.dataPath,
      javaVersion: opts.javaVersion,
    });

    await prisma.server.update({
      where: { id: serverId },
      data: { containerId, pluginInstalled },
    });

    setProvisioning(serverId, "starting", 80, "Starting server...");
    await startContainer(containerId);

    setProvisioning(serverId, "ready", 100, "Server is ready!");
  } catch (e) {
    setProvisioning(serverId, "error", 0, "Provisioning failed", (e as Error).message);
  }
}

export async function listServers(): Promise<ServerInfo[]> {
  const servers = await prisma.server.findMany({ orderBy: { createdAt: "desc" } });
  return Promise.all(
    servers.map(async (s) =>
      toServerInfo(s, s.containerId ? await getContainerStatus(s.containerId) : "unknown")
    )
  );
}

export async function getServer(serverId: string) {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) return null;
  return {
    ...server,
    status: server.containerId ? await getContainerStatus(server.containerId) : "unknown",
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
  s: { id: string; name: string; description: string | null; type: string; mcVersion: string; gamePort: number; rconPort: number; pluginPort: number; memory: string; javaVersion: string; autoStart: boolean; pluginInstalled: boolean; createdAt: Date },
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
    javaVersion: s.javaVersion,
    autoStart: s.autoStart,
    pluginInstalled: s.pluginInstalled,
    status,
    createdAt: s.createdAt,
  };
}
