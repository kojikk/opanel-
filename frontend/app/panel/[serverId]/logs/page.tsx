"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, Trash2, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LogFile {
  name: string;
  size: number;
}

export default function LogsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const api = serverApi(serverId);

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
      toast.error("Failed to load log");
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      await api.logs.remove(fileName);
      toast.success("Log deleted");
      fetchLogs();
      if (viewing === fileName) setViewing(null);
    } catch {
      toast.error("Failed to delete log");
    }
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
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <div className="p-4 border-b flex items-center gap-2">
          <Button variant="ghost" onClick={() => setViewing(null)}>Back</Button>
          <span className="font-medium">{viewing}</span>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-sm font-mono bg-black text-white">{content}</pre>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Logs</h1>
        <Button variant="outline" onClick={() => { api.logs.remove(); fetchLogs(); }}>
          Clear Old Logs
        </Button>
      </div>

      <div className="grid gap-2">
        {logs.map((log) => (
          <div key={log.name} className="border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{log.name}</span>
              <span className="text-xs text-muted-foreground">{(log.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex gap-2">
              {log.name.endsWith(".log") && (
                <Button variant="outline" size="sm" onClick={() => handleView(log.name)}>
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
              )}
              <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(log.name)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No log files
          </div>
        )}
      </div>
    </div>
  );
}
