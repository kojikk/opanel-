"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Blocks,
  Upload,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Search,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { $ } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

interface PluginInfo {
  name: string;
  fileName: string;
  size: number;
  enabled: boolean;
}

export default function PluginsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PluginInfo | null>(null);

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

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".jar")) {
      toast.error("Only .jar files are supported");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      await api.plugins.upload(file, (p) => setUploadProgress(Math.round(p * 100)));
      toast.success("Plugin uploaded");
      fetchPlugins();
    } catch {
      toast.error("Failed to upload plugin");
    } finally {
      setUploading(false);
    }
  }, [serverId]);

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".jar";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUpload(file);
    };
    input.click();
  };

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
    try {
      await api.plugins.remove(plugin.fileName);
      toast.success("Plugin deleted");
      fetchPlugins();
    } catch {
      toast.error("Failed to delete plugin");
    }
  };

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleUpload(file);
    };

    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [handleUpload]);

  const enabled = plugins.filter((p) => p.enabled);
  const disabled = plugins.filter((p) => !p.enabled);
  const filtered = (list: PluginInfo[]) =>
    list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const PluginTable = ({ list }: { list: PluginInfo[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plugin</TableHead>
          <TableHead>Size</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((plugin) => (
          <TableRow key={plugin.fileName}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{plugin.name}</span>
                <Badge variant={plugin.enabled ? "default" : "secondary"} className="text-xs">
                  {plugin.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{plugin.fileName}</span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {(plugin.size / 1024 / 1024).toFixed(1)} MB
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleToggle(plugin)}>
                  {plugin.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(plugin)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
              No plugins
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <SubPage
      title="Plugins"
      category={$("sidebar.management")}
      icon={<Blocks />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plugins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleFileSelect} disabled={uploading}>
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {uploadProgress}%</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Upload Plugin</>
          )}
        </Button>
      </div>

      <div
        ref={dropRef}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragging ? "border-primary bg-accent/50" : "border-muted"
        )}>
        <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Drag & drop a .jar file to upload</p>
      </div>

      <Tabs defaultValue="enabled">
        <TabsList>
          <TabsTrigger value="enabled">Enabled ({enabled.length})</TabsTrigger>
          <TabsTrigger value="disabled">Disabled ({disabled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="enabled">
          <PluginTable list={filtered(enabled)} />
        </TabsContent>
        <TabsContent value="disabled">
          <PluginTable list={filtered(disabled)} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Plugin"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
      />
    </SubPage>
  );
}
