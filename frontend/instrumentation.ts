/**
 * Next.js instrumentation hook — runs once at server start.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Tasks scheduler — runs cron jobs defined per server in the database.
  const { initScheduler } = await import("@/lib/tasks/scheduler");
  await initScheduler();

  // Metrics collector — periodic snapshots of CPU/RAM/TPS/players for each server.
  const { startMetricsCollector } = await import("@/lib/metrics/collector");
  await startMetricsCollector();
}
