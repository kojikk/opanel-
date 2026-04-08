import { prisma } from "@/lib/db/client";

/**
 * Server-side panel-wide configuration stored in the PanelSetting table.
 *
 * Defaults are returned when no row exists. Setting a value to `null`
 * deletes the row (falls back to default).
 */

export interface PanelSettings {
  /** How often to record server metrics (in minutes). */
  metricsIntervalMinutes: number;
  /** How long to keep metric records (in days). */
  metricsRetentionDays: number;
  /** Whether automatic backups are enabled. */
  autoBackupEnabled: boolean;
  /** Cron expression for automatic backups. */
  autoBackupCron: string;
  /** How long to keep automatic backups (in days). */
  backupRetentionDays: number;
}

export const PANEL_SETTING_DEFAULTS: PanelSettings = {
  metricsIntervalMinutes: 1,
  metricsRetentionDays: 30,
  autoBackupEnabled: false,
  autoBackupCron: "0 4 * * *", // every day at 04:00
  backupRetentionDays: 7,
};

type Key = keyof PanelSettings;

function parseValue<K extends Key>(key: K, raw: string): PanelSettings[K] {
  const def = PANEL_SETTING_DEFAULTS[key];
  if (typeof def === "number") {
    const n = Number(raw);
    return (Number.isFinite(n) ? n : def) as PanelSettings[K];
  }
  if (typeof def === "boolean") {
    return (raw === "true") as PanelSettings[K];
  }
  return raw as PanelSettings[K];
}

function serializeValue(value: PanelSettings[Key]): string {
  return String(value);
}

export async function getPanelSettings(): Promise<PanelSettings> {
  const rows = await prisma.panelSetting.findMany();
  const result = { ...PANEL_SETTING_DEFAULTS };
  for (const row of rows) {
    if (row.key in PANEL_SETTING_DEFAULTS) {
      const k = row.key as Key;
      (result as Record<Key, unknown>)[k] = parseValue(k, row.value);
    }
  }
  return result;
}

export async function getPanelSetting<K extends Key>(key: K): Promise<PanelSettings[K]> {
  const row = await prisma.panelSetting.findUnique({ where: { key } });
  if (!row) return PANEL_SETTING_DEFAULTS[key];
  return parseValue(key, row.value);
}

export async function updatePanelSettings(updates: Partial<PanelSettings>): Promise<PanelSettings> {
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in PANEL_SETTING_DEFAULTS)) continue;
    if (value === undefined || value === null) {
      await prisma.panelSetting.deleteMany({ where: { key } });
      continue;
    }
    const serialized = serializeValue(value as PanelSettings[Key]);
    await prisma.panelSetting.upsert({
      where: { key },
      create: { key, value: serialized },
      update: { value: serialized },
    });
  }
  return getPanelSettings();
}
