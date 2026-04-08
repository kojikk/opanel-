"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { sendGetRequest, sendPatchRequest } from "@/lib/api-client";

interface PanelSettings {
  metricsIntervalMinutes: number;
  metricsRetentionDays: number;
  autoBackupEnabled: boolean;
  autoBackupCron: string;
  backupRetentionDays: number;
}

export function PanelSettingsTab() {
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [draft, setDraft] = useState<PanelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sendGetRequest<{ settings: PanelSettings }>("/api/admin/settings")
      .then((res) => {
        setSettings(res.settings);
        setDraft(res.settings);
      })
      .catch(() => toast.error("Failed to load panel settings"))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof PanelSettings>(key: K, value: PanelSettings[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await sendPatchRequest<{ settings: PanelSettings }>("/api/admin/settings", draft);
      setSettings(res.settings);
      setDraft(res.settings);
      toast.success("Panel settings saved");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to save panel settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="space-y-4">
      {/* ── Metrics ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Monitoring</CardTitle>
          <CardDescription>
            How often server metrics (CPU, RAM, TPS, players) are recorded and how long they are kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium">Recording interval (minutes)</label>
              <p className="text-xs text-muted-foreground">Between 1 and 60.</p>
            </div>
            <Input
              type="number"
              min={1}
              max={60}
              value={draft.metricsIntervalMinutes}
              onChange={(e) => update("metricsIntervalMinutes", parseInt(e.target.value) || 1)}
              className="w-24"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium">Retention (days)</label>
              <p className="text-xs text-muted-foreground">Older records are deleted hourly.</p>
            </div>
            <Input
              type="number"
              min={1}
              max={365}
              value={draft.metricsRetentionDays}
              onChange={(e) => update("metricsRetentionDays", parseInt(e.target.value) || 1)}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Backups ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Backups</CardTitle>
          <CardDescription>
            Schedule and retention for automatic server backups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium">Enable automatic backups</label>
              <p className="text-xs text-muted-foreground">Run backups on a schedule for all servers.</p>
            </div>
            <Switch
              checked={draft.autoBackupEnabled}
              onCheckedChange={(v) => update("autoBackupEnabled", v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium">Schedule (cron)</label>
              <p className="text-xs text-muted-foreground">Default: <code>0 4 * * *</code> (4 AM daily).</p>
            </div>
            <Input
              type="text"
              value={draft.autoBackupCron}
              onChange={(e) => update("autoBackupCron", e.target.value)}
              className="w-40 font-mono"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium">Backup retention (days)</label>
              <p className="text-xs text-muted-foreground">How long automatic backups are kept.</p>
            </div>
            <Input
              type="number"
              min={1}
              max={365}
              value={draft.backupRetentionDays}
              onChange={(e) => update("backupRetentionDays", parseInt(e.target.value) || 1)}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!hasChanges || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
