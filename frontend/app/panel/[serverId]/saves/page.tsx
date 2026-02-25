"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, Trash2, Earth } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SaveInfo {
  name: string;
  size: number;
}

export default function SavesPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [saves, setSaves] = useState<SaveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const api = serverApi(serverId);

  const fetchSaves = async () => {
    try {
      const res = await api.saves.list();
      setSaves(res);
    } catch {
      toast.error("Failed to load saves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaves();
  }, [serverId]);

  const handleDelete = async (save: SaveInfo) => {
    if (!confirm(`Delete world "${save.name}"? This cannot be undone.`)) return;
    try {
      await api.saves.remove(save.name);
      toast.success("World deleted");
      fetchSaves();
    } catch {
      toast.error("Failed to delete world");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Saves / Worlds</h1>

      <div className="grid gap-2">
        {saves.map((save) => (
          <div key={save.name} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Earth className="h-8 w-8 text-muted-foreground" />
              <div>
                <span className="font-medium">{save.name}</span>
              </div>
            </div>
            <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(save)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {saves.length === 0 && (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No worlds found
          </div>
        )}
      </div>
    </div>
  );
}
