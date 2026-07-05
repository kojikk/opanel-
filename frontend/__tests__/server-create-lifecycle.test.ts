import { beforeEach, describe, expect, it, vi } from "vitest";

const { dockerMock, prismaMock, fsMock } = vi.hoisted(() => {
  const dockerMock = {
    isDockerAvailable: vi.fn(),
    pullImage: vi.fn(),
    createServerContainer: vi.fn(),
    startContainer: vi.fn(),
    stopContainer: vi.fn(),
    restartContainer: vi.fn(),
    removeContainer: vi.fn(),
    getContainerStatus: vi.fn(),
    getContainerStats: vi.fn(),
    listPanelContainers: vi.fn(),
  };
  const prismaMock = {
    server: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  const fsMock = {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
    rmSync: vi.fn(),
    copyFileSync: vi.fn(),
  };
  return { dockerMock, prismaMock, fsMock };
});

vi.mock("@/lib/docker/client", () => ({
  CONTAINER_PREFIX: "opanel-mc-",
  ...dockerMock,
}));

vi.mock("@/lib/db/client", () => ({ prisma: prismaMock }));

vi.mock("@/lib/rcon/client", () => ({ sendCommand: vi.fn() }));

vi.mock("fs", () => ({ default: fsMock, ...fsMock }));

import { createServer, deleteServer, listServers, reconcileServers } from "@/lib/server-manager";

const baseOpts = {
  name: "smp",
  type: "PAPER",
  mcVersion: "1.21.4",
  gamePort: 25565,
  rconPort: 25575,
  pluginPort: 3100,
};

const dbRow = {
  id: "srv1",
  name: "smp",
  description: null,
  type: "PAPER",
  mcVersion: "1.21.4",
  containerId: null as string | null,
  containerName: "opanel-mc-smp",
  rconPort: 25575,
  rconPassword: "pw",
  gamePort: 25565,
  pluginPort: 3100,
  memory: "2G",
  cpus: null as number | null,
  javaVersion: "21",
  dataPath: "/servers/smp",
  autoStart: false,
  pluginInstalled: false,
  provisionStatus: "creating",
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  dockerMock.isDockerAvailable.mockResolvedValue(true);
  dockerMock.pullImage.mockResolvedValue(undefined);
  dockerMock.createServerContainer.mockResolvedValue("cid123");
  dockerMock.startContainer.mockResolvedValue(undefined);
  dockerMock.removeContainer.mockResolvedValue(undefined);
  prismaMock.server.findFirst.mockResolvedValue(null);
  prismaMock.server.create.mockResolvedValue({ ...dbRow });
  prismaMock.server.update.mockResolvedValue({ ...dbRow, containerId: "cid123", provisionStatus: "ready" });
  prismaMock.server.delete.mockResolvedValue({ ...dbRow });
  fsMock.existsSync.mockReturnValue(false);
});

describe("createServer", () => {
  it("happy path: row created as creating, container started, flipped to ready", async () => {
    const info = await createServer(baseOpts);

    expect(prismaMock.server.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ provisionStatus: "creating", containerId: null }) })
    );
    expect(dockerMock.createServerContainer).toHaveBeenCalled();
    expect(dockerMock.startContainer).toHaveBeenCalledWith("cid123");
    expect(prismaMock.server.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { provisionStatus: "ready" } })
    );
    expect(prismaMock.server.delete).not.toHaveBeenCalled();
    expect(info.status).toBe("running");
  });

  it("passes cpus through to the container config and the DB row", async () => {
    await createServer({ ...baseOpts, cpus: 1.5 });
    expect(dockerMock.createServerContainer).toHaveBeenCalledWith(expect.objectContaining({ cpus: 1.5 }));
    expect(prismaMock.server.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cpus: 1.5 }) })
    );
  });

  it("rejects port collisions before any side effect", async () => {
    prismaMock.server.findFirst.mockResolvedValue({ ...dbRow, name: "other" });

    await expect(createServer(baseOpts)).rejects.toThrow(/Port conflict/);

    expect(prismaMock.server.create).not.toHaveBeenCalled();
    expect(fsMock.mkdirSync).not.toHaveBeenCalled();
    expect(dockerMock.pullImage).not.toHaveBeenCalled();
    expect(dockerMock.createServerContainer).not.toHaveBeenCalled();
  });

  it("container create fails: row deleted, dir cleanup attempted, error propagates", async () => {
    dockerMock.createServerContainer.mockRejectedValue(new Error("no such image"));

    await expect(createServer(baseOpts)).rejects.toThrow("no such image");

    expect(dockerMock.removeContainer).not.toHaveBeenCalled(); // never created
    expect(fsMock.rmSync).toHaveBeenCalledWith(expect.any(String), { recursive: true, force: true });
    expect(prismaMock.server.delete).toHaveBeenCalledWith({ where: { id: "srv1" } });
  });

  it("container start fails: container removed and row deleted", async () => {
    dockerMock.startContainer.mockRejectedValue(new Error("start boom"));

    await expect(createServer(baseOpts)).rejects.toThrow("start boom");

    expect(dockerMock.removeContainer).toHaveBeenCalledWith("cid123");
    expect(prismaMock.server.delete).toHaveBeenCalledWith({ where: { id: "srv1" } });
  });

  it("does not remove a data dir that existed before the create", async () => {
    fsMock.existsSync.mockReturnValue(true);
    dockerMock.startContainer.mockRejectedValue(new Error("start boom"));

    await expect(createServer(baseOpts)).rejects.toThrow("start boom");

    expect(fsMock.rmSync).not.toHaveBeenCalled();
    expect(prismaMock.server.delete).toHaveBeenCalled();
  });
});

describe("listServers status mapping", () => {
  it("reports 'missing' for rows whose container is gone and 'creating' for in-flight rows", async () => {
    prismaMock.server.findMany.mockResolvedValue([
      { ...dbRow, id: "a", containerId: "gone", provisionStatus: "ready" },
      { ...dbRow, id: "b", containerId: "alive", provisionStatus: "ready" },
      { ...dbRow, id: "c", containerId: null, provisionStatus: "creating" },
    ]);
    dockerMock.getContainerStatus.mockImplementation(async (id: string) =>
      id === "alive" ? "running" : "unknown"
    );

    const servers = await listServers();
    expect(servers.map((s) => s.status)).toEqual(["missing", "running", "creating"]);
  });
});

describe("reconcileServers", () => {
  it("returns correct missing/orphan sets and mutates nothing", async () => {
    prismaMock.server.findMany.mockResolvedValue([
      { ...dbRow, id: "a", containerId: "cid-a", containerName: "opanel-mc-a" },
      { ...dbRow, id: "b", containerId: "cid-gone", containerName: "opanel-mc-b" },
    ]);
    dockerMock.listPanelContainers.mockResolvedValue([
      { id: "cid-a", name: "opanel-mc-a" },
      { id: "cid-orphan", name: "opanel-mc-orphan" },
    ]);

    const result = await reconcileServers();

    expect(result.missingContainers.map((r) => r.id)).toEqual(["b"]);
    expect(result.orphanContainers).toEqual([{ id: "cid-orphan", name: "opanel-mc-orphan" }]);
    expect(prismaMock.server.delete).not.toHaveBeenCalled();
    expect(dockerMock.removeContainer).not.toHaveBeenCalled();
  });
});

describe("deleteServer", () => {
  it("deletes the row when removeContainer tolerates a gone container", async () => {
    prismaMock.server.findUnique.mockResolvedValue({ ...dbRow, containerId: "cid123" });
    dockerMock.removeContainer.mockResolvedValue(undefined); // 404 handled inside

    await deleteServer("srv1");

    expect(prismaMock.server.delete).toHaveBeenCalledWith({ where: { id: "srv1" } });
  });

  it("keeps the row when container removal genuinely fails", async () => {
    prismaMock.server.findUnique.mockResolvedValue({ ...dbRow, containerId: "cid123" });
    dockerMock.removeContainer.mockRejectedValue(new Error("docker daemon error"));

    await expect(deleteServer("srv1")).rejects.toThrow("docker daemon error");
    expect(prismaMock.server.delete).not.toHaveBeenCalled();
  });
});
