"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ScrollText,
  Trash2,
  FileText,
  Eye,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import AnsiToHtml from "ansi-to-html";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import { $ } from "@/lib/i18n";

const ansiConverter = new AnsiToHtml({ fg: "#ccc", bg: "transparent" });

interface LogFile {
  name: string;
  size: number;
}

export default function LogsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const fetchLogs = async () => {
    try {
      const res = await api.logs.list();
      setLogs(res);
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [serverId]);

  const handleView = async (fileName: string) => {
    try {
      const res = await api.logs.get(fileName);
      setContent(res.content);
      setViewing(fileName);
    } catch {
      toast.error("Failed to load log file");
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete log "${fileName}"?`)) return;
    try {
      await api.logs.remove(fileName);
      toast.success("Log deleted");
      fetchLogs();
      if (viewing === fileName) setViewing(null);
    } catch {
      toast.error("Failed to delete log");
    }
  };

  const handleClearOld = async () => {
    if (!confirm("Delete all old log files?")) return;
    try {
      await api.logs.remove();
      toast.success("Old logs cleared");
      fetchLogs();
    } catch {
      toast.error("Failed to clear logs");
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

  if (viewing) {
    return (
      <SubPage
        title={viewing}
        category="Logs"
        icon={<FileText />}
        hideNavbar
        className="flex-1 min-h-0 flex flex-col">
        <Button variant="ghost" size="sm" className="self-start mb-2" onClick={() => setViewing(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to logs
        </Button>
        <pre className="flex-1 overflow-auto p-4 text-sm font-mono bg-black text-white rounded-sm">
          {content.split("\n").map((line, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(line) }} />
          ))}
        </pre>
      </SubPage>
    );
  }

  return (
    <SubPage
      title="Logs"
      category={$("sidebar.management")}
      icon={<ScrollText />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleClearOld}>
          <Trash2 className="h-4 w-4 mr-2" /> Clear Old Logs
        </Button>
      </div>

      {logs.length > 0 ? (
        <div className="grid gap-2">
          {logs.map((log) => (
            <div key={log.name} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-medium">{log.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatSize(log.size)}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {(log.name.endsWith(".log") || log.name.endsWith(".txt")) && (
                  <Button variant="outline" size="sm" onClick={() => handleView(log.name)}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive h-8 w-8"
                  onClick={() => handleDelete(log.name)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No log files
        </div>
      )}
    </SubPage>
  );
}
