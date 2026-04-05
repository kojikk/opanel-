import crypto from "crypto";
import { execFile } from "child_process";
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
const PLUGIN_PROJECT_DIR = path.resolve(process.env.OPANEL_PLUGIN_PROJECT_DIR || path.join(process.cwd(), "../plugin"));
const PLUGIN_BUILD_DIR = path.resolve(process.env.OPANEL_PLUGIN_BUILD_DIR || path.join(PLUGIN_PROJECT_DIR, "build/libs"));

function getPluginVersion(): string {
  try {
    const props = fs.readFileSync(path.join(PLUGIN_PROJECT_DIR, "gradle.properties"), "utf-8");
    const match = props.match(/^version\s*=\s*(.+)$/m);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

export interface ProvisioningStatus {
  step: "queued" | "pulling" | "building" | "creating" | "starting" | "ready" | "error";
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

/**
 * Maps panel server type → Gradle module prefix and JAR name prefix.
 * Paper/Bukkit/Leaves use spigot modules (API-compatible).
 * Spigot modules output JARs as `opanel-bukkit-*`, others use their loader name.
 */
const LOADER_CONFIG: Record<string, { module: string; jar: string }> = {
  paper:    { module: "spigot",   jar: "bukkit" },
  bukkit:   { module: "spigot",   jar: "bukkit" },
  spigot:   { module: "spigot",   jar: "bukkit" },
  leaves:   { module: "spigot",   jar: "bukkit" },
  fabric:   { module: "fabric",   jar: "fabric" },
  forge:    { module: "forge",    jar: "forge" },
  neoforge: { module: "neoforge", jar: "neoforge" },
  folia:    { module: "folia",    jar: "folia" },
};

const parseVer = (v: string) => v.split(".").map(Number);

/** Compare two version arrays. Returns negative if a < b, 0 if equal, positive if a > b. */
function compareVer(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Find the best matching Gradle module for a server type + MC version.
 * Scans plugin/ for directories like `spigot-1.21.9`, picks highest version ≤ mcVersion.
 * Returns { module: "spigot-1.21.9", jarPrefix: "opanel-bukkit-1.21.9" } or null.
 */
function findBestModule(serverType: string, mcVersion: string): { module: string; jarName: string } | null {
  const config = LOADER_CONFIG[serverType.toLowerCase()];
  if (!config) return null;

  try {
    const dirs = fs.readdirSync(PLUGIN_PROJECT_DIR, { withFileTypes: true });
    const prefix = `${config.module}-`;
    const serverVer = parseVer(mcVersion);
    const candidates: { dir: string; version: number[] }[] = [];

    for (const d of dirs) {
      if (d.isDirectory() && d.name.startsWith(prefix) && d.name !== `${config.module}-helper`) {
        const ver = parseVer(d.name.slice(prefix.length));
        if (compareVer(ver, serverVer) <= 0) {
          candidates.push({ dir: d.name, version: ver });
        }
      }
    }

    if (candidates.length === 0) return null;

    // Pick highest compatible version
    candidates.sort((a, b) => compareVer(b.version, a.version));
    const best = candidates[0];
    const versionStr = best.dir.slice(prefix.length);
    const pluginVer = getPluginVersion();
    const jarName = pluginVer
      ? `opanel-${config.jar}-${versionStr}-build-${pluginVer}.jar`
      : `opanel-${config.jar}-${versionStr}-build.jar`;
    return { module: best.dir, jarName };
  } catch {
    return null;
  }
}

/**
 * Find an already-built JAR in PLUGIN_BUILD_DIR.
 * Tries exact name first, then falls back to glob matching the base pattern.
 */
function findBuiltJar(jarName: string): string | null {
  const jarPath = path.join(PLUGIN_BUILD_DIR, jarName);
  if (fs.existsSync(jarPath)) return jarPath;

  // Fallback: match without version suffix (e.g. opanel-bukkit-1.21.9-build*.jar)
  const base = jarName.replace(/\.jar$/, "");
  try {
    const files = fs.readdirSync(PLUGIN_BUILD_DIR);
    const match = files.find((f) => f.startsWith(base) && f.endsWith(".jar"));
    return match ? path.join(PLUGIN_BUILD_DIR, match) : null;
  } catch {
    return null;
  }
}

/**
 * Build a single Gradle module on demand.
 * Runs `./gradlew :<module>:build -x test` and returns the output JAR path.
 */
function buildPluginModule(moduleName: string, jarName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const gradlew = isWindows ? "gradlew.bat" : "./gradlew";

    execFile(
      gradlew,
      [`:${moduleName}:build`, "-x", "test"],
      { cwd: PLUGIN_PROJECT_DIR, timeout: 600_000, maxBuffer: 10 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`Plugin build failed: ${stderr || error.message}`));
          return;
        }
        const jarPath = path.join(PLUGIN_BUILD_DIR, jarName);
        if (fs.existsSync(jarPath)) {
          resolve(jarPath);
        } else {
          reject(new Error(`Build succeeded but JAR not found at ${jarPath}`));
        }
      },
    );
  });
}

/**
 * Install the OPanel plugin into a server's plugins/ directory.
 * 1. Explicit OPANEL_PLUGIN_JAR_PATH env (highest priority)
 * 2. Pre-built JAR from build/libs matching server type + version
 * 3. On-demand Gradle build of the matching module
 */
async function installPlugin(
  dataPath: string,
  serverType: string,
  mcVersion: string,
  onStatus?: (message: string) => void,
): Promise<boolean> {
  // 1. Explicit path from env
  if (OPANEL_PLUGIN_JAR && fs.existsSync(OPANEL_PLUGIN_JAR)) {
    return copyJarToPlugins(OPANEL_PLUGIN_JAR, dataPath);
  }

  // 2. Find best matching module
  const match = findBestModule(serverType, mcVersion);
  if (!match) {
    onStatus?.("No compatible plugin module found, skipping plugin installation");
    return false;
  }

  // 3. Check if already built
  let jarPath = findBuiltJar(match.jarName);
  if (jarPath) {
    return copyJarToPlugins(jarPath, dataPath);
  }

  // 4. Build on demand
  onStatus?.(`Building plugin ${match.module}...`);
  try {
    jarPath = await buildPluginModule(match.module, match.jarName);
    return copyJarToPlugins(jarPath, dataPath);
  } catch (e) {
    onStatus?.(`Plugin build failed: ${(e as Error).message}`);
    return false;
  }
}

function copyJarToPlugins(jarPath: string, dataPath: string): boolean {
  try {
    const pluginsDir = path.join(dataPath, "plugins");
    fs.mkdirSync(pluginsDir, { recursive: true });
    fs.copyFileSync(jarPath, path.join(pluginsDir, path.basename(jarPath)));
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

    // Build/install plugin (may trigger on-demand Gradle build)
    setProvisioning(serverId, "building", 35, "Installing OPanel plugin...");
    const pluginInstalled = await installPlugin(
      opts.dataPath, opts.type, opts.mcVersion,
      (msg) => setProvisioning(serverId, "building", 40, msg),
    );

    setProvisioning(serverId, "creating", 55, "Creating container...");
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
