import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Avoid instantiating a real PrismaClient / RCON pool at import time.
vi.mock("@/lib/db/client", () => ({ prisma: {} }));
vi.mock("@/lib/rcon/client", () => ({ sendCommand: vi.fn() }));

import {
  _resetForTests,
  _setDepsForTests,
  cancelAllTasks,
  cancelTask,
  initScheduler,
  reloadTask,
  scheduleTask,
} from "@/lib/tasks/scheduler";

type Job = { stop: Mock<() => void> };

function createFakeDeps() {
  const jobs: Job[] = [];
  const callbacks: Array<() => void | Promise<void>> = [];
  const schedule = vi.fn((_expr: string, cb: () => void | Promise<void>) => {
    const job: Job = { stop: vi.fn(() => {}) };
    jobs.push(job);
    callbacks.push(cb);
    return job;
  });
  const validate = vi.fn(() => true);
  const findUnique = vi.fn();
  const findMany = vi.fn();
  const sendCommand = vi.fn(async () => "ok");

  _setDepsForTests({
    cron: { schedule, validate },
    prisma: { task: { findUnique, findMany } },
    sendCommand,
  });

  return { jobs, callbacks, schedule, validate, findUnique, findMany, sendCommand };
}

const globalState = globalThis as unknown as {
  __fleetpanelCronJobs?: Map<string, { stop: () => void }>;
  __fleetpanelSchedulerLoaded?: boolean;
};

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    enabled: true,
    cron: "*/5 * * * *",
    commands: ["say hello"],
    server: { rconPort: 25575, rconPassword: "secret" },
    ...overrides,
  };
}

beforeEach(() => {
  _resetForTests();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("task lifecycle scheduling", () => {
  it("schedules exactly once with the task's cron expression on create", () => {
    const deps = createFakeDeps();

    scheduleTask("task-1", "*/5 * * * *");

    expect(deps.schedule).toHaveBeenCalledTimes(1);
    expect(deps.schedule).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);
  });

  it("does not schedule an invalid cron expression", () => {
    const deps = createFakeDeps();
    deps.validate.mockReturnValue(false);

    scheduleTask("task-1", "not a cron");

    expect(deps.schedule).not.toHaveBeenCalled();
    expect(globalState.__fleetpanelCronJobs!.size).toBe(0);
  });

  it("cancels the job when the task is disabled (reloadTask)", async () => {
    const deps = createFakeDeps();
    scheduleTask("task-1", "*/5 * * * *");

    deps.findUnique.mockResolvedValue(makeTask({ enabled: false }));
    await reloadTask("task-1");

    expect(deps.jobs[0].stop).toHaveBeenCalledTimes(1);
    expect(globalState.__fleetpanelCronJobs!.size).toBe(0);
  });

  it("cancels the job on delete (cancelTask)", () => {
    const deps = createFakeDeps();
    scheduleTask("task-1", "*/5 * * * *");

    cancelTask("task-1");

    expect(deps.jobs[0].stop).toHaveBeenCalledTimes(1);
    expect(globalState.__fleetpanelCronJobs!.size).toBe(0);
  });

  it("schedules again on re-enable (reloadTask)", async () => {
    const deps = createFakeDeps();
    scheduleTask("task-1", "*/5 * * * *");

    deps.findUnique.mockResolvedValue(makeTask({ enabled: false }));
    await reloadTask("task-1");
    expect(globalState.__fleetpanelCronJobs!.size).toBe(0);

    deps.findUnique.mockResolvedValue(makeTask({ enabled: true, cron: "0 * * * *" }));
    await reloadTask("task-1");

    expect(deps.schedule).toHaveBeenCalledTimes(2);
    expect(deps.schedule).toHaveBeenLastCalledWith("0 * * * *", expect.any(Function));
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);
  });

  it("rescheduling the same task replaces the old job instead of duplicating", () => {
    const deps = createFakeDeps();
    scheduleTask("task-1", "*/5 * * * *");
    scheduleTask("task-1", "0 * * * *");

    expect(deps.jobs[0].stop).toHaveBeenCalledTimes(1);
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);
  });

  it("reloadTask survives a DB error without throwing and keeps the job", async () => {
    const deps = createFakeDeps();
    scheduleTask("task-1", "*/5 * * * *");

    deps.findUnique.mockRejectedValue(new Error("db down"));
    await expect(reloadTask("task-1")).resolves.toBeUndefined();

    expect(deps.jobs[0].stop).not.toHaveBeenCalled();
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);
  });
});

describe("cron callback behavior", () => {
  it("sends every command over RCON when the task is alive and enabled", async () => {
    const deps = createFakeDeps();
    deps.findUnique.mockResolvedValue(makeTask({ commands: ["save-all", "say saved"] }));

    scheduleTask("task-1", "*/5 * * * *");
    await deps.callbacks[0]();

    expect(deps.sendCommand).toHaveBeenCalledTimes(2);
    expect(deps.sendCommand).toHaveBeenNthCalledWith(1, "localhost", 25575, "secret", "save-all");
    expect(deps.sendCommand).toHaveBeenNthCalledWith(2, "localhost", 25575, "secret", "say saved");
  });

  it("skips and cancels the job when the task was deleted", async () => {
    const deps = createFakeDeps();
    deps.findUnique.mockResolvedValue(null);

    scheduleTask("task-1", "*/5 * * * *");
    await expect(Promise.resolve(deps.callbacks[0]())).resolves.toBeUndefined();

    expect(deps.sendCommand).not.toHaveBeenCalled();
    expect(deps.jobs[0].stop).toHaveBeenCalledTimes(1);
    expect(globalState.__fleetpanelCronJobs!.size).toBe(0);
  });

  it("skips and cancels the job when the server is gone", async () => {
    const deps = createFakeDeps();
    deps.findUnique.mockResolvedValue(makeTask({ server: null }));

    scheduleTask("task-1", "*/5 * * * *");
    await deps.callbacks[0]();

    expect(deps.sendCommand).not.toHaveBeenCalled();
    expect(deps.jobs[0].stop).toHaveBeenCalledTimes(1);
  });

  it("skips and cancels the job when the task was disabled since scheduling", async () => {
    const deps = createFakeDeps();
    deps.findUnique.mockResolvedValue(makeTask({ enabled: false }));

    scheduleTask("task-1", "*/5 * * * *");
    await deps.callbacks[0]();

    expect(deps.sendCommand).not.toHaveBeenCalled();
    expect(deps.jobs[0].stop).toHaveBeenCalledTimes(1);
  });

  it("catches RCON failures — no unhandled rejection, remaining commands still run", async () => {
    const deps = createFakeDeps();
    deps.findUnique.mockResolvedValue(makeTask({ commands: ["boom", "after"] }));
    deps.sendCommand.mockRejectedValueOnce(new Error("rcon refused"));

    scheduleTask("task-1", "*/5 * * * *");
    await expect(Promise.resolve(deps.callbacks[0]())).resolves.toBeUndefined();

    expect(deps.sendCommand).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalled();
    // Job stays scheduled after a transient RCON failure.
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);
  });

  it("skips the firing (without cancelling) when the DB check itself fails", async () => {
    const deps = createFakeDeps();
    deps.findUnique.mockRejectedValue(new Error("db down"));

    scheduleTask("task-1", "*/5 * * * *");
    await expect(Promise.resolve(deps.callbacks[0]())).resolves.toBeUndefined();

    expect(deps.sendCommand).not.toHaveBeenCalled();
    expect(deps.jobs[0].stop).not.toHaveBeenCalled();
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);
  });
});

describe("initScheduler", () => {
  it("schedules all enabled tasks once; a second call is a no-op", async () => {
    const deps = createFakeDeps();
    deps.findMany.mockResolvedValue([
      makeTask({ id: "task-1" }),
      makeTask({ id: "task-2", cron: "0 * * * *" }),
    ]);

    await initScheduler();
    await initScheduler();

    expect(deps.findMany).toHaveBeenCalledTimes(1);
    expect(deps.schedule).toHaveBeenCalledTimes(2);
    expect(globalState.__fleetpanelCronJobs!.size).toBe(2);
  });

  it("does not crash startup when the DB is unavailable and allows a retry", async () => {
    const deps = createFakeDeps();
    deps.findMany.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    await expect(initScheduler()).resolves.toBeUndefined();
    expect(globalState.__fleetpanelCronJobs!.size).toBe(0);

    deps.findMany.mockResolvedValue([makeTask()]);
    await initScheduler();
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);
  });

  it("module re-eval with intact globalThis produces no duplicate jobs", async () => {
    const deps = createFakeDeps();
    scheduleTask("task-1", "*/5 * * * *");
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);

    // Simulate a dev hot reload: the module is re-evaluated from scratch,
    // but globalThis (and thus the jobs map) survives.
    vi.resetModules();
    const fresh = await import("@/lib/tasks/scheduler");
    fresh._setDepsForTests({
      cron: { schedule: deps.schedule, validate: deps.validate },
      prisma: { task: { findUnique: deps.findUnique, findMany: deps.findMany } },
      sendCommand: deps.sendCommand,
    });

    fresh.scheduleTask("task-1", "*/5 * * * *");

    // The old job (created by the pre-reload module instance) was stopped,
    // not orphaned, and the map still holds exactly one job.
    expect(deps.jobs[0].stop).toHaveBeenCalledTimes(1);
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);

    fresh.cancelAllTasks();
  });

  it("initScheduler after re-eval is still a no-op when already loaded", async () => {
    const deps = createFakeDeps();
    deps.findMany.mockResolvedValue([makeTask()]);
    await initScheduler();
    expect(deps.schedule).toHaveBeenCalledTimes(1);

    vi.resetModules();
    const fresh = await import("@/lib/tasks/scheduler");
    fresh._setDepsForTests({
      cron: { schedule: deps.schedule, validate: deps.validate },
      prisma: { task: { findUnique: deps.findUnique, findMany: deps.findMany } },
      sendCommand: deps.sendCommand,
    });

    await fresh.initScheduler();

    expect(deps.findMany).toHaveBeenCalledTimes(1);
    expect(deps.schedule).toHaveBeenCalledTimes(1);
    expect(globalState.__fleetpanelCronJobs!.size).toBe(1);

    fresh.cancelAllTasks();
    (globalThis as Record<string, unknown>).__fleetpanelSchedulerLoaded = false;
  });
});

describe("cancelAllTasks", () => {
  it("stops every job and empties the map", () => {
    const deps = createFakeDeps();
    scheduleTask("task-1", "*/5 * * * *");
    scheduleTask("task-2", "0 * * * *");

    cancelAllTasks();

    expect(deps.jobs[0].stop).toHaveBeenCalled();
    expect(deps.jobs[1].stop).toHaveBeenCalled();
    expect(globalState.__fleetpanelCronJobs!.size).toBe(0);
  });
});
