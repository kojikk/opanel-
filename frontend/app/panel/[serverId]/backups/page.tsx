"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Archive, Download, HardDriveDownload, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { $ } from "@/lib/i18n";

interface Backup {
  id: string;
  serverId: string;
  fileName: string;
  size: number;
  type: "MANUAL" | "AUTO";
  notes: string | null;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function BackupsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createNotes, setCreateNotes] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);

  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoreEntries, setRestoreEntries] = useState<string[]>([]);
  const [restorePartial, setRestorePartial] = useState(false);
  const [restoreSelected, setRestoreSelected] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);

  const fetchBackups = async () => {
    try {
      const res = await api.backups.list();
      setBackups(res);
    } catch {
      toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [serverId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.backups.create(createNotes || undefined);
      toast.success("Backup created");
      setCreateOpen(false);
      setCreateNotes("");
      fetchBackups();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to create backup");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (backup: Backup) => {
    try {
      await api.backups.remove(backup.id);
      toast.success("Backup deleted");
      fetchBackups();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to delete backup");
    }
  };

  const openRestoreDialog = async (backup: Backup) => {
    setRestoreTarget(backup);
    setRestorePartial(false);
    setRestoreSelected(new Set());
    setRestoreEntries([]);
    try {
      const res = await api.backups.inspect(backup.id);
      setRestoreEntries(res.entries);
    } catch {
      toast.error("Failed to inspect backup");
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const paths = restorePartial ? Array.from(restoreSelected) : undefined;
      if (restorePartial && (!paths || paths.length === 0)) {
        toast.error("Select at least one entry to restore");
        setRestoring(false);
        return;
      }
      await api.backups.restore(restoreTarget.id, paths);
      toast.success("Restore completed");
      setRestoreTarget(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  };

  const toggleSelected = (entry: string) => {
    setRestoreSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entry)) next.delete(entry);
      else next.add(entry);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <SubPage
      title="Backups"
      category={$("sidebar.config")}
      icon={<Archive />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Backup
        </Button>
      </div>

      {backups.length > 0 ? (
        <div className="grid gap-2">
          {backups.map((b) => (
            <div
              key={b.id}
              className="border rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Archive className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{b.fileName}</span>
                    <Badge variant={b.type === "AUTO" ? "secondary" : "outline"} className="text-xs">
                      {b.type}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(b.createdAt)} &middot; {formatSize(b.size)}
                    {b.notes && <> &middot; {b.notes}</>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <a href={api.backups.downloadUrl(b.id)} download>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => openRestoreDialog(b)}>
                  <HardDriveDownload className="h-3.5 w-3.5 mr-1" /> Restore
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive h-8 w-8"
                  onClick={() => setDeleteTarget(b)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No backups yet. Click &ldquo;New Backup&rdquo; to create one.
        </div>
      )}

      {/* ── Create Backup Dialog ─────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>
              Archive the entire server data folder. Live worlds will be flushed to disk before the snapshot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Input
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              placeholder="Before update..."
              disabled={creating}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Dialog ───────────────────────────────── */}
      <Dialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              The server must be stopped before restoring. Full restore replaces the entire data folder.
            </DialogDescription>
          </DialogHeader>
          {restoreTarget && (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="font-medium">{restoreTarget.fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(restoreTarget.createdAt)} &middot; {formatSize(restoreTarget.size)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium">Partial restore</label>
                  <p className="text-xs text-muted-foreground">
                    Only restore selected entries (e.g. worlds or plugins).
                  </p>
                </div>
                <Switch checked={restorePartial} onCheckedChange={setRestorePartial} />
              </div>

              {restorePartial && (
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {restoreEntries.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 text-center">
                      Loading archive contents...
                    </div>
                  ) : (
                    restoreEntries.map((entry) => (
                      <label
                        key={entry}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 cursor-pointer border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={restoreSelected.has(entry)}
                          onChange={() => toggleSelected(entry)}
                        />
                        <span className="text-sm font-mono">{entry}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRestore} disabled={restoring}>
              {restoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <HardDriveDownload className="h-4 w-4 mr-2" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Backup"
        description={`Permanently delete "${deleteTarget?.fileName}"? This cannot be undone.`}
        confirmText="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
      />
    </SubPage>
  );
}
