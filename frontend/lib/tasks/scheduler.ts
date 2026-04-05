import cron from "node-cron";
import { prisma } from "@/lib/db/client";
import { sendCommand } from "@/lib/rcon/client";

const scheduledJobs = new Map<string, cron.ScheduledTask>();

export async function initScheduler() {
  const tasks = await prisma.task.findMany({
    where: { enabled: true },
    include: { server: true },
  });

  for (const task of tasks) {
    scheduleTask(task.id, task.cron, task.commands, task.server.rconPort, task.server.rconPassword);
  }
}

export function scheduleTask(taskId: string, cronExpr: string, commands: string[], rconPort: number, rconPassword: string) {
  cancelTask(taskId);

  if (!cron.validate(cronExpr)) {
    console.error(`Invalid cron expression for task ${taskId}: ${cronExpr}`);
    return;
  }

  const job = cron.schedule(cronExpr, async () => {
    for (const command of commands) {
      try {
        await sendCommand("localhost", rconPort, rconPassword, command);
      } catch (e) {
        console.error(`Failed to execute task ${taskId} command "${command}":`, e);
      }
    }
  });

  scheduledJobs.set(taskId, job);
}

export function cancelTask(taskId: string) {
  const existing = scheduledJobs.get(taskId);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(taskId);
  }
}

export function cancelAllTasks() {
  for (const [, job] of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.clear();
}

export async function reloadTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { server: true },
  });

  if (!task || !task.enabled) {
    cancelTask(taskId);
    return;
  }

  scheduleTask(task.id, task.cron, task.commands, task.server.rconPort, task.server.rconPassword);
}
