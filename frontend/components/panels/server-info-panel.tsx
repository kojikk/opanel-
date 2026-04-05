"use client";

import { useRef, useState, useEffect, useContext } from "react";
import { useParams } from "next/navigation";
import {
  Server,
  Play,
  Square,
  RotateCw,
  Pencil,
  Check,
  X,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/contexts/server-context";

export function ServerInfoPanel() {
  const { serverId } = useParams<{ serverId: string }>();
  const serverCtx = useContext(ServerContext);
  const api = serverApi(serverId);

  const [status, setStatus] = useState(serverCtx?.status ?? "unknown");
  const [actionLoading, setActionLoading] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconKey, setIconKey] = useState(0);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [motd, setMotd] = useState("");
  const [editingMotd, setEditingMotd] = useState(false);
  const [motdDraft, setMotdDraft] = useState("");

  useEffect(() => {
    if (serverCtx?.status) setStatus(serverCtx.status);
  }, [serverCtx?.status]);

  useEffect(() => {
    const img = new Image();
    img.src = api.icon.get() + `?t=${iconKey}`;
    img.onload = () => setIconUrl(img.src);
    img.onerror = () => setIconUrl(null);
  }, [serverId, iconKey]);

  useEffect(() => {
    api.motd.get().then((r) => setMotd(r.motd)).catch(() => {});
  }, [serverId]);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.icon.upload(file);
      setIconKey((k) => k + 1);
      toast.success("Icon updated");
    } catch {
      toast.error("Failed to upload icon");
    }
    e.target.value = "";
  };

  const handleMotdSave = async () => {
    try {
      await api.motd.set(motdDraft);
      setMotd(motdDraft);
      setEditingMotd(false);
      toast.success("MOTD updated");
    } catch {
      toast.error("Failed to update MOTD");
    }
  };

  const handleAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(true);
    try {
      await fetch(`/api/servers/${serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      toast.success(`Server ${action}ed`);
      setStatus(action === "stop" ? "exited" : "running");
    } catch {
      toast.error(`Failed to ${action} server`);
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = status === "running"
    ? "bg-green-600"
    : status === "exited" ? "bg-red-700" : "bg-yellow-600";

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex-1 flex max-md:flex-col gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => iconInputRef.current?.click()}
              className="group/icon relative w-16 h-16 shrink-0 rounded-md border bg-muted overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
            >
              {iconUrl ? (
                <img src={iconUrl} alt="Server icon" className="w-full h-full object-cover image-pixelated" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Server className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/icon:opacity-100 transition-opacity flex items-center justify-center">
                <ImagePlus className="h-5 w-5 text-white" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent>Change server icon</TooltipContent>
        </Tooltip>
        <input
          ref={iconInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={handleIconUpload}
        />

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold truncate">{serverCtx?.name ?? "Server"}</h2>
            <Badge variant="outline" className="cursor-default shrink-0">
              <div className={cn("w-2 h-2 rounded-full", statusColor)} />
              {status}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {editingMotd ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Input
                  value={motdDraft}
                  onChange={(e) => setMotdDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleMotdSave();
                    if (e.key === "Escape") setEditingMotd(false);
                  }}
                  className="h-7 text-sm flex-1"
                  placeholder="Server MOTD..."
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleMotdSave}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingMotd(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0 group/motd">
                <p className="text-sm text-muted-foreground truncate">
                  {motd || "A Minecraft Server"}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover/motd:opacity-100 transition-opacity"
                  onClick={() => { setMotdDraft(motd); setEditingMotd(true); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div><span className="font-semibold">Type:</span> {serverCtx?.type ?? "\u2014"}</div>
            <div><span className="font-semibold">Version:</span> {serverCtx?.mcVersion ?? "\u2014"}</div>
            <div><span className="font-semibold">Port:</span> {serverCtx?.gamePort ?? "\u2014"}</div>
            <div><span className="font-semibold">Memory:</span> {serverCtx?.memory ?? "\u2014"}</div>
            <div><span className="font-semibold">Java:</span> {serverCtx?.javaVersion ?? "\u2014"}</div>
          </div>
        </div>

        <div className="flex items-start gap-2 shrink-0">
          {status === "running" ? (
            <>
              <Button variant="outline" size="sm" disabled={actionLoading} onClick={() => handleAction("restart")}>
                <RotateCw className="h-4 w-4 mr-1" /> Restart
              </Button>
              <Button variant="outline" size="sm" disabled={actionLoading} onClick={() => handleAction("stop")}>
                <Square className="h-4 w-4 mr-1" /> Stop
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" disabled={actionLoading} onClick={() => handleAction("start")}>
              <Play className="h-4 w-4 mr-1" /> Start
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
