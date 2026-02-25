"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AnsiToHtml from "ansi-to-html";

const ansiConverter = new AnsiToHtml({ fg: "#aaa", bg: "#000" });

export default function TerminalPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const api = serverApi(serverId);

  useEffect(() => {
    const eventSource = new EventSource(`/api/servers/${serverId}/terminal`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          setLogs((prev) => [...prev.slice(-500), data.message]);
        }
      } catch { /* ignore */ }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [serverId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const sendCommand = async () => {
    if (!command.trim()) return;

    try {
      const result = await api.terminal.send(command.trim());
      setLogs((prev) => [...prev, `> ${command}`, result.result || ""]);
      setHistory((prev) => [command, ...prev]);
      setCommand("");
      setHistoryIndex(-1);
    } catch {
      toast.error("Failed to send command");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const idx = historyIndex + 1;
        setHistoryIndex(idx);
        setCommand(history[idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const idx = historyIndex - 1;
        setHistoryIndex(idx);
        setCommand(history[idx]);
      } else {
        setHistoryIndex(-1);
        setCommand("");
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="flex-1 overflow-auto bg-black text-white font-mono text-sm p-4">
        {logs.map((line, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(line) }} />
        ))}
        <div ref={logsEndRef} />
      </div>
      <div className="flex border-t bg-background p-2 gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 bg-transparent border rounded-md px-3 py-1.5 text-sm font-mono"
          autoFocus
        />
        <Button size="icon" onClick={sendCommand}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
