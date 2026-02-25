"use client";

import { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PaintBucket, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { $ } from "@/lib/i18n";
import { VersionContext } from "@/contexts/api-context";
import { isBukkit } from "@/lib/utils";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const ALL_CONFIG_FILES = [
  { key: "server.properties", label: "server.properties", lang: "ini" },
  { key: "bukkit.yml", label: "bukkit.yml", lang: "yaml", bukkitOnly: true },
  { key: "spigot.yml", label: "spigot.yml", lang: "yaml", bukkitOnly: true },
  { key: "paper.yml", label: "paper.yml", lang: "yaml", bukkitOnly: true },
  { key: "paper-global.yml", label: "paper-global.yml", lang: "yaml", bukkitOnly: true },
  { key: "leaves.yml", label: "leaves.yml", lang: "yaml" },
  { key: "config/paper-world-defaults.yml", label: "paper-world-defaults.yml", lang: "yaml", bukkitOnly: true },
];

export default function SettingsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const versionCtx = useContext(VersionContext);
  const api = serverApi(serverId);

  const configFiles = ALL_CONFIG_FILES.filter((f) => {
    if (f.bukkitOnly && versionCtx && !isBukkit(versionCtx.serverType)) return false;
    return true;
  });

  const [selectedFile, setSelectedFile] = useState(configFiles[0]?.key ?? "server.properties");
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async (file: string) => {
    setLoading(true);
    try {
      const res = (await api.control.getFile(file)) as { content: string };
      setContent(res.content);
      setOriginalContent(res.content);
    } catch {
      setContent("");
      setOriginalContent("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig(selectedFile);
  }, [selectedFile, serverId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content, selectedFile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.control.setFile(selectedFile, content);
      setOriginalContent(content);
      toast.success("Saved. Restart server to apply changes.");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = content !== originalContent;
  const currentLang = configFiles.find((f) => f.key === selectedFile)?.lang ?? "plaintext";

  return (
    <SubPage
      title="Settings"
      category={$("sidebar.config")}
      icon={<PaintBucket />}
      hideNavbar
      outerClassName="max-h-screen overflow-y-hidden"
      className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Select value={selectedFile} onValueChange={setSelectedFile}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {configFiles.map((f) => (
              <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
        {hasChanges && <span className="text-xs text-muted-foreground">Unsaved changes (Ctrl+S)</span>}
      </div>

      <div className="flex-1 min-h-0 border rounded-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <Editor
            height="100%"
            language={currentLang}
            value={content}
            onChange={(v) => setContent(v ?? "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        )}
      </div>
    </SubPage>
  );
}
