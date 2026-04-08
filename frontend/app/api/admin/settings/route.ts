import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import cron from "node-cron";
import { requireAuth } from "@/lib/auth";
import { getPanelSettings, updatePanelSettings, PANEL_SETTING_DEFAULTS } from "@/lib/panel-settings";
import { restartMetricsCollector } from "@/lib/metrics/collector";

/** GET current panel settings. OWNER/ADMIN only. */
export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getPanelSettings();
  return NextResponse.json({ settings, defaults: PANEL_SETTING_DEFAULTS });
}

/** PATCH panel settings. OWNER/ADMIN only. */
export async function PATCH(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Validate types and ranges
  const updates: Record<string, unknown> = {};
  if (body.metricsIntervalMinutes !== undefined) {
    const v = Number(body.metricsIntervalMinutes);
    if (!Number.isFinite(v) || v < 1 || v > 60) {
      return NextResponse.json({ error: "metricsIntervalMinutes must be between 1 and 60" }, { status: 400 });
    }
    updates.metricsIntervalMinutes = Math.floor(v);
  }
  if (body.metricsRetentionDays !== undefined) {
    const v = Number(body.metricsRetentionDays);
    if (!Number.isFinite(v) || v < 1 || v > 365) {
      return NextResponse.json({ error: "metricsRetentionDays must be between 1 and 365" }, { status: 400 });
    }
    updates.metricsRetentionDays = Math.floor(v);
  }
  if (body.autoBackupEnabled !== undefined) {
    updates.autoBackupEnabled = Boolean(body.autoBackupEnabled);
  }
  if (body.autoBackupCron !== undefined) {
    if (typeof body.autoBackupCron !== "string" || !cron.validate(body.autoBackupCron)) {
      return NextResponse.json({ error: "autoBackupCron must be a valid cron expression" }, { status: 400 });
    }
    updates.autoBackupCron = body.autoBackupCron;
  }
  if (body.backupRetentionDays !== undefined) {
    const v = Number(body.backupRetentionDays);
    if (!Number.isFinite(v) || v < 1 || v > 365) {
      return NextResponse.json({ error: "backupRetentionDays must be between 1 and 365" }, { status: 400 });
    }
    updates.backupRetentionDays = Math.floor(v);
  }

  const updated = await updatePanelSettings(updates);

  // Reload background workers that depend on these settings.
  if ("metricsIntervalMinutes" in updates || "metricsRetentionDays" in updates) {
    await restartMetricsCollector();
  }

  return NextResponse.json({ settings: updated });
}
