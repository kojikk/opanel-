import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";

/** Throws unless `resolved` is `base` itself or located inside `base`. */
export function assertInsideBase(resolved: string, base: string): void {
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error("Path traversal not allowed");
  }
}

async function getServerDataPath(serverId: string): Promise<string> {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) throw new Error("Server not found");
  return server.dataPath;
}

export async function readServerFile(serverId: string, relativePath: string): Promise<string> {
  const dataPath = await getServerDataPath(serverId);
  const filePath = path.join(dataPath, relativePath);
  const resolved = path.resolve(filePath);
  assertInsideBase(resolved, path.resolve(dataPath));
  return fs.readFile(resolved, "utf-8");
}

export async function writeServerFile(serverId: string, relativePath: string, content: string): Promise<void> {
  const dataPath = await getServerDataPath(serverId);
  const filePath = path.join(dataPath, relativePath);
  const resolved = path.resolve(filePath);
  assertInsideBase(resolved, path.resolve(dataPath));
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf-8");
}

export async function readServerFileBuffer(serverId: string, relativePath: string): Promise<Buffer> {
  const dataPath = await getServerDataPath(serverId);
  const filePath = path.join(dataPath, relativePath);
  const resolved = path.resolve(filePath);
  assertInsideBase(resolved, path.resolve(dataPath));
  return fs.readFile(resolved);
}

export async function writeServerFileBuffer(serverId: string, relativePath: string, content: Buffer): Promise<void> {
  const dataPath = await getServerDataPath(serverId);
  const filePath = path.join(dataPath, relativePath);
  const resolved = path.resolve(filePath);
  assertInsideBase(resolved, path.resolve(dataPath));
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content);
}

export async function deleteServerFile(serverId: string, relativePath: string): Promise<void> {
  const dataPath = await getServerDataPath(serverId);
  const filePath = path.join(dataPath, relativePath);
  const resolved = path.resolve(filePath);
  assertInsideBase(resolved, path.resolve(dataPath));
  await fs.rm(resolved, { recursive: true, force: true });
}

export async function listServerDirectory(serverId: string, relativePath: string): Promise<{ name: string; isDirectory: boolean; size: number }[]> {
  const dataPath = await getServerDataPath(serverId);
  const dirPath = path.join(dataPath, relativePath);
  const resolved = path.resolve(dirPath);
  assertInsideBase(resolved, path.resolve(dataPath));

  try {
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const results = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(resolved, entry.name);
        let size = 0;
        try {
          const stat = await fs.stat(entryPath);
          size = stat.size;
        } catch { /* skip */ }
        return { name: entry.name, isDirectory: entry.isDirectory(), size };
      })
    );
    return results;
  } catch {
    return [];
  }
}

export async function fileExists(serverId: string, relativePath: string): Promise<boolean> {
  const dataPath = await getServerDataPath(serverId);
  const filePath = path.join(dataPath, relativePath);
  const resolved = path.resolve(filePath);
  assertInsideBase(resolved, path.resolve(dataPath));
  try {
    await fs.access(resolved);
    return true;
  } catch {
    return false;
  }
}
