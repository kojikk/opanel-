// Next.js instrumentation hook (stable since Next 15 — no experimental flag needed).
// register() runs once per server process on boot; we use it to start the
// cron task scheduler.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const g = globalThis as unknown as { __fleetpanelSchedulerInit?: boolean };
    // Guard against double-init (dev hot reload / multiple register calls).
    if (g.__fleetpanelSchedulerInit) return;
    g.__fleetpanelSchedulerInit = true;

    const { initScheduler } = await import("@/lib/tasks/scheduler");
    await initScheduler();
  }
}
