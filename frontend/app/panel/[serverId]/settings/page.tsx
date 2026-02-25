"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CONFIG_FILES = [
  { key: "server.properties", label: "server.properties" },
  { key: "bukkit.yml", label: "bukkit.yml" },
  { key: "spigot.yml", label: "spigot.yml" },
  { key: "paper.yml", label: "paper.yml" },
  { key: "paper-global.yml", label: "paper-global.yml" },
];

export default function SettingsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [selectedFile, setSelectedFile] = useState("server.properties");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const api = serverApi(serverId);

  const fetchConfig = async (file: string) => {
    setLoading(true);
    try {
      const res = await api.control.getFile(file) as { content: string };
      setContent(res.content);
    } catch {
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig(selectedFile);
  }, [selectedFile, serverId]);

  const handleSave = async () => {
    try {
      await api.control.setFile(selectedFile, content);
      toast.success("Configuration saved. Restart server to apply changes.");
    } catch {
      toast.error("Failed to save configuration");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="p-4 border-b flex items-center gap-4">
        <h1 className="text-lg font-bold">Settings</h1>
        <select
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          className="border rounded-md px-3 py-1.5 bg-background text-sm"
        >
          {CONFIG_FILES.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleSave}>
          <Save className="mr-2 h-3 w-3" /> Save
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 p-4 font-mono text-sm bg-black text-white resize-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}
