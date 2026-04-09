"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Server, Play, Square, Trash2, Loader2, AlertTriangle, RefreshCw, Lock } from "lucide-react";
import { sendGetRequest, sendPatchRequest, sendDeleteRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { toast } from "sonner";

interface ServerInfo {
  id: string;
  name: string;
  type: string;
  mcVersion: string;
  gamePort: number;
  rconPort: number;
  memory: string;
  status: string;
  createdAt: string;
}

export default function ServerListPage() {
  const router = useRouter();
  const user = useCheckAuth();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ServerInfo | null>(null);

  // Only OWNER/ADMIN can create servers or manage them from the list page.
  // Regular USERs drill into a server dashboard where controls are permission-gated.
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  const fetchServers = async () => {
    try {
      const data = await sendGetRequest<ServerInfo[]>("/api/servers");
      setServers(data);
    } catch {
      toast.error("Failed to load servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (serverId: string, action: "start" | "stop") => {
    try {
      await sendPatchRequest(`/api/servers/${serverId}`, { action });
      toast.success(`Server ${action === "start" ? "started" : "stopped"}`);
      fetchServers();
    } catch {
      toast.error(`Failed to ${action} server`);
    }
  };

  const handleDelete = async (serverId: string) => {
    try {
      await sendDeleteRequest(`/api/servers/${serverId}`);
      toast.success("Server deleted");
      fetchServers();
    } catch {
      toast.error("Failed to delete server");
    }
  };

  const handleRecreate = async (serverId: string) => {
    try {
      await sendPatchRequest(`/api/servers/${serverId}`, { action: "recreate" });
      toast.success("Container recreated, server starting...");
      fetchServers();
    } catch {
      toast.error("Failed to recreate container");
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "running": return "text-green-500";
      case "exited": return "text-red-500";
      case "created": return "text-yellow-500";
      case "container_missing": return "text-amber-500";
      default: return "text-muted-foreground";
    }
  };

  const statusLabel = (status: string) => {
    if (status === "container_missing") return "container missing";
    return status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
    <Navbar />
    <div className="p-6 max-w-5xl mx-auto flex-1 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Servers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {canManage ? "Manage your Minecraft servers" : "Servers you have access to"}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => router.push("/panel/create")}>
            <Plus className="mr-2 h-4 w-4" />
            New Server
          </Button>
        )}
      </div>

      {servers.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          {canManage ? (
            <>
              <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No servers yet</h2>
              <p className="text-muted-foreground mb-4">Create your first Minecraft server to get started.</p>
              <Button onClick={() => router.push("/panel/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Server
              </Button>
            </>
          ) : (
            <>
              <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No server access</h2>
              <p className="text-muted-foreground">
                You don&apos;t have access to any servers. Contact an administrator to request access.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`border rounded-lg p-4 flex items-center justify-between transition-colors ${
                server.status === "container_missing"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "hover:bg-accent/50 cursor-pointer"
              }`}
              onClick={() => server.status !== "container_missing" && router.push(`/panel/${server.id}/dashboard`)}
            >
              <div className="flex items-center gap-4">
                <Server className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{server.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {server.type} {server.mcVersion} &middot; Port {server.gamePort} &middot; {server.memory} RAM
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <span className={`text-sm font-medium capitalize ${statusColor(server.status)}`}>
                  {server.status === "container_missing" && <AlertTriangle className="inline w-4 h-4 mr-1 -mt-0.5" />}
                  {statusLabel(server.status)}
                </span>
                {canManage && (
                  <>
                    {server.status === "container_missing" ? (
                      <Button variant="outline" size="sm" onClick={() => handleRecreate(server.id)}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Recreate
                      </Button>
                    ) : server.status === "running" ? (
                      <Button variant="outline" size="icon" onClick={() => handleAction(server.id, "stop")}>
                        <Square className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon" onClick={() => handleAction(server.id, "start")}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="text-destructive" onClick={() => setDeleteTarget(server)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(v) => !v && setDeleteTarget(null)}
      title="Delete Server"
      description={`This will remove the container for "${deleteTarget?.name}". Data on disk will be preserved.`}
      confirmText="Delete"
      destructive
      confirmInput={deleteTarget?.name}
      onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget.id); }}
    />
    </div>
  );
}
