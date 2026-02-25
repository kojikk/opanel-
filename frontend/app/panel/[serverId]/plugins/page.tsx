"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, Upload, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PluginInfo {
  name: string;
  fileName: string;
  size: number;
  enabled: boolean;
}

export default function PluginsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const api = serverApi(serverId);

  const fetchPlugins = async () => {
    try {
      const res = await api.plugins.list();
      setPlugins(res);
    } catch {
      toast.error("Failed to load plugins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, [serverId]);

  const handleToggle = async (plugin: PluginInfo) => {
    try {
      await api.plugins.toggle(plugin.fileName, !plugin.enabled);
      toast.success(`Plugin ${plugin.enabled ? "disabled" : "enabled"}`);
      fetchPlugins();
    } catch {
      toast.error("Failed to toggle plugin");
    }
  };

  const handleDelete = async (plugin: PluginInfo) => {
    if (!confirm(`Delete ${plugin.name}?`)) return;
    try {
      await api.plugins.remove(plugin.fileName);
      toast.success("Plugin deleted");
      fetchPlugins();
    } catch {
      toast.error("Failed to delete plugin");
    }
  };

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".jar";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        await api.plugins.upload(file);
        toast.success("Plugin uploaded");
        fetchPlugins();
      } catch {
        toast.error("Failed to upload plugin");
      }
    };
    input.click();
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plugins</h1>
        <Button onClick={handleUpload}>
          <Upload className="mr-2 h-4 w-4" /> Upload Plugin
        </Button>
      </div>

      <div className="grid gap-2">
        {plugins.map((plugin) => (
          <div key={plugin.fileName} className="border rounded-lg p-3 flex items-center justify-between">
            <div>
              <span className="font-medium">{plugin.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {(plugin.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => handleToggle(plugin)}>
                {plugin.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(plugin)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {plugins.length === 0 && (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No plugins installed
          </div>
        )}
      </div>
    </div>
  );
}
