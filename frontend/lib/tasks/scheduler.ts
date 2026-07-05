import cron from "node-cron";
import { prisma } from "@/lib/db/client";
import { sendCommand } from "@/lib/rcon/client";

// --- Injectable dependencies (for unit tests) ---

type ScheduledJob = { stop: () => void };

type CronDep = {
  validate: (expr: string) => boolean;
  schedule: (expr: string, callback: () => void | Promise<void>) => ScheduledJob;
};

type TaskWithServer = {
  id: string;
  enabled: boolean;
  cron: string;
  commands: string[];
  server: { rconPort: number; rconPassword: string } | null;
};

type PrismaDep = {
  task: {
    findMany: (args: {
      where: { enabled: boolean };
      include: { server: boolean };
    }) => Promise<TaskWithServer[]>;
    findUnique: (args: {
      where: { id: string };
      include: { server: boolean };
    }) => Promise<TaskWithServer | null>;
  };
};

type SendCommandDep = (host: string, port: number, password: string, command: string) => Promise<string>;

type Deps = {
  cron: CronDep;
  prisma: PrismaDep;
  sendCommand: SendCommandDep;
};

const deps: Deps = {
  cron,
  prisma: prisma as unknown as PrismaDep,
  sendCommand,
};

export function _setDepsForTests(overrides: Partial<Deps>) {
  Object.assign(deps, overrides);
}

// --- Global state ---
// Jobs and the init flag live on globalThis so that dev hot reloads
// (module re-evaluation) reuse the same map instead of orphaning
// still-running node-cron timers.

const g = globalThis as unknown as {
  __opanelCronJobs?: Map<string, ScheduledJob>;
  __opanelSchedulerLoaded?: boolean;
};

const scheduledJobs = (g.__opanelCronJobs ??= new Map<string, ScheduledJob>());

export function _resetForTests() {
  cancelAllTasks();
  g.__opanelSchedulerLoaded = false;
}

// --- Public API ---

/**
 * Load all enabled tasks from the DB and schedule them.
 * Idempotent: repeated calls (dev hot reload, multiple register() invocations)
 * are no-ops after the first successful run. Never throws — a briefly
 * unavailable DB must not crash startup.
 */
export async function initScheduler(): Promise<void> {
  if (g.__opanelSchedulerLoaded) return;
  g.__opanelSchedulerLoaded = true;

  try {
    const tasks = await deps.prisma.task.findMany({
      where: { enabled: true },
      include: { server: true },
    });

    for (const task of tasks) {
      scheduleTask(task.id, task.cron);
    }

    console.log(`[scheduler] Initialized: ${tasks.length} enabled task(s) scheduled`);
  } catch (e) {
    // Allow a later retry if the DB was briefly unavailable.
    g.__opanelSchedulerLoaded = false;
    console.error("[scheduler] Failed to initialize (DB unavailable?):", e);
  }
}

/**
 * Schedule (or reschedule) a task. The cron callback re-reads the task from
 * the DB on every firing, so stale commands / RCON credentials are never used
 * and deleted or disabled tasks self-cancel.
 */
export function scheduleTask(taskId: string, cronExpr: string): void {
  cancelTask(taskId);

  if (!deps.cron.validate(cronExpr)) {
    console.error(`[scheduler] Invalid cron expression for task ${taskId}: ${cronExpr}`);
    return;
  }

  const job = deps.cron.schedule(cronExpr, async () => {
    try {
      await runTask(taskId);
    } catch (e) {
      // Belt-and-suspenders: no unhandled rejection may escape the timer.
      console.error(`[scheduler] Unexpected error running task ${taskId}:`, e);
    }
  });

  scheduledJobs.set(taskId, job);
}

async function runTask(taskId: string): Promise<void> {
  let task: TaskWithServer | null;
  try {
    task = await deps.prisma.task.findUnique({
      where: { id: taskId },
      include: { server: true },
    });
  } catch (e) {
    // Transient DB failure: log and skip this firing, keep the job alive.
    console.error(`[scheduler] Failed to load task ${taskId}, skipping this run:`, e);
    return;
  }

  if (!task || !task.server) {
    console.warn(`[scheduler] Task ${taskId} or its server no longer exists, cancelling job`);
    cancelTask(taskId);
    return;
  }

  if (!task.enabled) {
    console.warn(`[scheduler] Task ${taskId} is disabled, cancelling job`);
    cancelTask(taskId);
    return;
  }

  for (const command of task.commands) {
    try {
      await deps.sendCommand("localhost", task.server.rconPort, task.server.rconPassword, command);
    } catch (e) {
      console.error(`[scheduler] Task ${taskId} command "${command}" failed:`, e);
    }
  }
}

export function cancelTask(taskId: string): void {
  const existing = scheduledJobs.get(taskId);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(taskId);
  }
}

export function cancelAllTasks(): void {
  for (const [, job] of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.clear();
}

/**
 * Re-sync one task with the DB: schedule if it exists and is enabled,
 * cancel otherwise. Never throws.
 */
export async function reloadTask(taskId: string): Promise<void> {
  let task: TaskWithServer | null;
  try {
    task = await deps.prisma.task.findUnique({
      where: { id: taskId },
      include: { server: true },
    });
  } catch (e) {
    console.error(`[scheduler] Failed to reload task ${taskId}:`, e);
    return;
  }

  if (!task || !task.enabled) {
    cancelTask(taskId);
    return;
  }

  scheduleTask(task.id, task.cron);
}
