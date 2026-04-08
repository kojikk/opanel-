import cron from "node-cron";
import { listServers } from "@/lib/server-manager";
import { getPanelSettings } from "@/lib/panel-settings";
import { createBackup, cleanupOldBackups } from "./manager";

/**
 * Auto-backup CRON worker.
 *
 * Reads `autoBackupEnabled` and `autoBackupCron` from PanelSettings.
 * On each tick, snapshots every running server and writes a Backup row
 * with type=AUTO. A separate hourly job prunes auto-backups older than
 * `backupRetentionDays`.
 */

let backupJob: cron.ScheduledTask | null = null;
let cleanupJob: cron.ScheduledTask | null = null;

async function runBackupCycle() {
  try {
    const servers = await listServers();
    for (const server of servers) {
      // Skip servers that aren't healthy enough to back up safely
      if (server.status === "container_missing" || server.status === "unknown") continue;

      try {
        await createBackup(server.id, { type: "AUTO" });
        console.log(`[backups] auto-backup created for ${server.id}`);
      } catch (e) {
        console.error(`[backups] auto-backup failed for ${server.id}:`, (e as Error).message);
      }
    }
  } catch (e) {
    console.error("[backups] auto-backup cycle failed:", e);
  }
}

export async function startBackupScheduler() {
  stopBackupScheduler();

  const settings = await getPanelSettings();

  // Cleanup runs hourly regardless of whether auto-backups are enabled —
  // it covers manually-marked AUTO entries that may still exist.
  cleanupJob = cron.schedule("15 * * * *", () => {
    cleanupOldBackups().catch((e) => console.error("[backups] cleanup failed:", e));
  });

  if (!settings.autoBackupEnabled) {
    console.log("[backups] auto-backup disabled");
    return;
  }

  if (!cron.validate(settings.autoBackupCron)) {
    console.error(`[backups] invalid cron expression: ${settings.autoBackupCron}`);
    return;
  }

  backupJob = cron.schedule(settings.autoBackupCron, runBackupCycle);
  console.log(`[backups] auto-backup scheduled (cron: ${settings.autoBackupCron}, retention: ${settings.backupRetentionDays}d)`);
}

export function stopBackupScheduler() {
  if (backupJob) {
    backupJob.stop();
    backupJob = null;
  }
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }
}

export async function restartBackupScheduler() {
  await startBackupScheduler();
}
