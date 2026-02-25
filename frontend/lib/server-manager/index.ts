import crypto from "crypto";
import path from "path";
import { prisma } from "@/lib/db/client";
import { sendCommand } from "@/lib/rcon/client";
import {
  createServerContainer,
  startContainer,
  stopContainer,
  removeContainer,
  getContainerStatus,
  getContainerStats,
  pullImage,
  type ContainerStats,
} from "@/lib/docker/client";

const SERVERS_BASE_PATH = process.env.SERVERS_BASE_PATH || "./servers";

export interface ServerInfo {
  id: string;
  name: string;
  type: string;
  mcVersion: string;
  gamePort: number;
  rconPort: number;
  pluginPort: number;
  memory: string;
  status: string;
  createdAt: Date;
}

export async function createServer(opts: {
  name: string;
  type: string;
  mcVersion: string;
  memory?: string;
  gamePort: number;
  rconPort: number;
  pluginPort?: number;
}): Promise<ServerInfo> {
  const rconPassword = crypto.randomBytes(16).toString("hex");
  const pluginPort = opts.pluginPort || 3000 + Math.floor(Math.random() * 1000);
  const dataPath = path.resolve(SERVERS_BASE_PATH, opts.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"));

  await pullImage();

  const containerId = await createServerContainer({
    name: opts.name,
    type: opts.type,
    mcVersion: opts.mcVersion,
    memory: opts.memory || "2G",
    gamePort: opts.gamePort,
    rconPort: opts.rconPort,
    rconPassword,
    pluginPort,
    dataPath,
  });

  const server = await prisma.server.create({
    data: {
      name: opts.name,
      type: opts.type,
      mcVersion: opts.mcVersion,
      containerId,
      containerName: `opanel-mc-${opts.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
      rconPort: opts.rconPort,
      rconPassword,
      gamePort: opts.gamePort,
      pluginPort,
      memory: opts.memory || "2G",
      dataPath,
    },
  });

  await startContainer(containerId);

  return {
    id: server.id,
    name: server.name,
    type: server.type,
    mcVersion: server.mcVersion,
    gamePort: server.gamePort,
    rconPort: server.rconPort,
    pluginPort: server.pluginPort,
    memory: server.memory,
    status: "running",
    createdAt: server.createdAt,
  };
}

export async function listServers(): Promise<ServerInfo[]> {
  const servers = await prisma.server.findMany({ orderBy: { createdAt: "desc" } });

  return Promise.all(
    servers.map(async (s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      mcVersion: s.mcVersion,
      gamePort: s.gamePort,
      rconPort: s.rconPort,
      pluginPort: s.pluginPort,
      memory: s.memory,
      status: s.containerId ? await getContainerStatus(s.containerId) : "unknown",
      createdAt: s.createdAt,
    }))
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
