"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Earth, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { $ } from "@/lib/i18n";

interface SaveInfo {
  name: string;
  size: number;
}

export default function SavesPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);
  const [saves, setSaves] = useState<SaveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SaveInfo | null>(null);

  const fetchSaves = async () => {
    try {
      const res = await api.saves.list();
      setSaves(res);
    } catch {
      toast.error("Failed to load worlds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaves();
  }, [serverId]);

  const handleDelete = async (save: SaveInfo) => {
    try {
      await api.saves.remove(save.name);
      toast.success("World deleted");
      fetchSaves();
    } catch {
      toast.error("Failed to delete world");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
      title="Saves / Worlds"
      category={$("sidebar.server")}
      icon={<Earth />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col gap-4">
      {saves.length > 0 ? (
        <div className="grid gap-3">
          {saves.map((save) => (
            <Card key={save.name} className="p-4 flex items-center justify-between shadow-none">
              <div className="flex items-center gap-4">
                <Earth className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{save.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatSize(save.size)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="text-destructive"
                onClick={() => setDeleteTarget(save)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No worlds found
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete World"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        destructive
        confirmInput={deleteTarget?.name}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
      />
    </SubPage>
  );
}
