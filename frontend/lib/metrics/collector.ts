import cron from "node-cron";
import { prisma } from "@/lib/db/client";
import { getServerStats, listServers, executeCommand } from "@/lib/server-manager";
import { parseTps } from "@/lib/rcon/parsers";
import { getPanelSettings } from "@/lib/panel-settings";

let activeJob: cron.ScheduledTask | null = null;
let cleanupJob: cron.ScheduledTask | null = null;

/**
 * Collect a single metric snapshot for every running server and persist it.
 */
async function collectOnce() {
  try {
    const servers = await listServers();
    const running = servers.filter((s) => s.status === "running");

    for (const server of running) {
      try {
        const stats = await getServerStats(server.id);
        if (!stats) continue;

        // Try plugin first, fall back to RCON, then default to 20.
        let tps = 20;
        let players = 0;

        const dbServer = await prisma.server.findUnique({ where: { id: server.id } });
        if (dbServer?.pluginInstalled) {
          try {
            const res = await fetch(`http://localhost:${dbServer.pluginPort}/api/monitor`, {
              signal: AbortSignal.timeout(2000),
            });
            if (res.ok) {
              const data = await res.json();
              tps = data.tps ?? tps;
              players = data.playersOnline ?? players;
            }
          } catch { /* fall through */ }
        }

        if (tps === 20) {
          try {
            const tpsResp = await executeCommand(server.id, "tps");
            tps = parseTps(tpsResp);
          } catch { /* ignore */ }
        }

        if (players === 0) {
          try {
            const listResp = await executeCommand(server.id, "list");
            const m = listResp.match(/(\d+)\s+of\s+a\s+max\s+of\s+\d+/i)
              ?? listResp.match(/There are (\d+)/i);
            if (m) players = parseInt(m[1], 10);
          } catch { /* ignore */ }
        }

        await prisma.serverMetric.create({
          data: {
            serverId: server.id,
            cpu: stats.cpuPercent,
            memory: stats.memoryUsageMB,
            tps,
            players,
          },
        });
      } catch (e) {
        console.error(`[metrics] failed to collect for ${server.id}:`, e);
      }
    }
  } catch (e) {
    console.error("[metrics] collection cycle failed:", e);
  }
}

/**
 * Delete metrics older than the configured retention period.
 */
async function cleanupOldMetrics() {
  try {
    const settings = await getPanelSettings();
    const cutoff = new Date(Date.now() - settings.metricsRetentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.serverMetric.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });
    if (result.count > 0) {
      console.log(`[metrics] cleaned up ${result.count} old metrics`);
    }
  } catch (e) {
    console.error("[metrics] cleanup failed:", e);
  }
}

/**
 * (Re)schedule the metrics collector based on current panel settings.
 * Safe to call multiple times — cancels existing jobs first.
 */
export async function startMetricsCollector() {
  stopMetricsCollector();

  const settings = await getPanelSettings();
  const interval = Math.max(1, settings.metricsIntervalMinutes);

  // Run every N minutes. node-cron uses standard cron syntax.
  const cronExpr = interval === 1 ? "* * * * *" : `*/${interval} * * * *`;

  if (!cron.validate(cronExpr)) {
    console.error(`[metrics] invalid cron expression: ${cronExpr}`);
    return;
  }

  activeJob = cron.schedule(cronExpr, collectOnce);

  // Cleanup runs once an hour.
  cleanupJob = cron.schedule("0 * * * *", cleanupOldMetrics);

  console.log(`[metrics] collector started (interval: ${interval}m, retention: ${settings.metricsRetentionDays}d)`);
}

export function stopMetricsCollector() {
  if (activeJob) {
    activeJob.stop();
    activeJob = null;
  }
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }
}

/**
 * Restart the collector — call after panel settings change.
 */
export async function restartMetricsCollector() {
  await startMetricsCollector();
}
