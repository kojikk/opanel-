"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatConsoleLine } from "@/lib/formatting-codes/console";
import { serverApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function ConsolePanel() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [command, setCommand] = useState("");

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`/api/servers/${serverId}/terminal`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          setLogs((prev) => [...prev.slice(-100), data.message]);
        }
      } catch { /* ignore */ }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [serverId]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const send = async () => {
    if (!command.trim()) return;
    try {
      const res = await api.terminal.send(command.trim());
      setLogs((prev) => [...prev, `> ${command.trim()}`, ...(res.result ? [res.result] : [])]);
    } catch {
      setLogs((prev) => [...prev, `> ${command.trim()}`, "Error: Failed to execute command"]);
    }
    setCommand("");
  };

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      <div className="flex items-center justify-end px-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" asChild>
          <Link href={`/panel/${serverId}/terminal`}>
            Full <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-auto bg-black text-white font-mono text-xs rounded-sm p-2 min-h-0">
        {logs.map((line, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: formatConsoleLine(line) }} />
        ))}
        <div ref={logsEndRef} />
      </div>
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="Enter command..."
        className="w-full rounded-sm border px-3 py-1.5 text-sm font-mono bg-background shrink-0"
      />
    </div>
  );
}
