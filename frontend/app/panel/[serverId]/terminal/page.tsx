"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AnsiToHtml from "ansi-to-html";
import { ArrowUp, Maximize, Minimize, SquareTerminal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubPage } from "../../sub-page";
import { cn } from "@/lib/utils";
import { $ } from "@/lib/i18n";
import { changeSettings, getSettings } from "@/lib/settings";

const ansiConverter = new AnsiToHtml({ fg: "#ccc", bg: "transparent" });

type LogLevel = "ALL" | "INFO" | "WARN" | "ERROR";

function matchesLevel(line: string, level: LogLevel): boolean {
  if (level === "ALL") return true;
  const upper = line.toUpperCase();
  if (level === "ERROR") return upper.includes("ERROR") || upper.includes("SEVERE") || upper.includes("FATAL");
  if (level === "WARN") return upper.includes("WARN") || matchesLevel(line, "ERROR");
  return true;
}

export default function TerminalPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const api = serverApi(serverId);

  const [logs, setLogs] = useState<string[]>([]);
  const [historyList, setHistoryList] = useState<string[]>(() => {
    try { return getSettings("state.terminal.history") || []; } catch { return []; }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [command, setCommand] = useState("");
  const [logLevel, setLogLevel] = useState<LogLevel>("ALL");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/servers/${serverId}/terminal`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          setLogs((prev) => [...prev.slice(-2000), data.message]);
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [serverId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    try { changeSettings("state.terminal.history", historyList); } catch { /* no-op */ }
  }, [historyList]);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleSend = useCallback(async () => {
    const cmd = inputRef.current?.value?.trim() || command.trim();
    if (!cmd) {
      toast.warning("Command is empty");
      return;
    }

    try {
      const res = await api.terminal.send(cmd);
      setLogs((prev) => [...prev, `> ${cmd}`, ...(res.result ? [res.result] : [])]);
      setHistoryList((prev) => [...prev, cmd]);
      setCommand("");
      if (inputRef.current) inputRef.current.value = "";
      setHistoryIndex(-1);
    } catch {
      toast.error("Failed to send command");
    }
    inputRef.current?.focus();
  }, [command, serverId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < historyList.length - 1) {
        const idx = historyIndex + 1;
        setHistoryIndex(idx);
        const cmd = historyList[historyList.length - 1 - idx];
        setCommand(cmd);
        if (inputRef.current) inputRef.current.value = cmd;
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const idx = historyIndex - 1;
        setHistoryIndex(idx);
        const cmd = historyList[historyList.length - 1 - idx];
        setCommand(cmd);
        if (inputRef.current) inputRef.current.value = cmd;
      } else {
        setHistoryIndex(-1);
        setCommand("");
        if (inputRef.current) inputRef.current.value = "";
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    inputRef.current?.focus();
  };

  const filteredLogs = logs.filter((line) => matchesLevel(line, logLevel));

  return (
    <SubPage
      title={$("terminal.title")}
      category={$("sidebar.management")}
      icon={<SquareTerminal />}
      hideNavbar
      outerClassName="max-h-screen overflow-y-hidden"
      className="flex-1 min-h-0 flex gap-3">
      <div
        ref={containerRef}
        className="bg-background flex-4/5 max-lg:flex-3/4 max-md:flex-1 min-w-0 flex flex-col border rounded-sm">
        <div className="flex-1 overflow-auto bg-black text-white font-mono text-sm p-3">
          {filteredLogs.map((line, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(line) }} />
          ))}
          <div ref={logsEndRef} />
        </div>
        <div className="p-3 flex gap-2">
          <Select value={logLevel} onValueChange={(v) => setLogLevel(v as LogLevel)}>
            <SelectTrigger className="w-24 max-sm:w-20 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="font-mono text-xs">
              <SelectItem value="ALL">ALL</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className={cn("flex-1 w-full rounded-sm border px-3 py-1.5 text-sm font-mono bg-background")}
            autoFocus
            maxLength={256}
          />
          <Button variant="ghost" size="icon" className="cursor-pointer" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
          <Button size="icon" className="cursor-pointer" onClick={() => handleSend()}>
            <ArrowUp />
          </Button>
        </div>
      </div>

      {/* Command History Sidebar */}
      <div className="flex-1/5 max-lg:flex-1/4 min-w-0 flex flex-col gap-2 max-md:hidden">
        <div className="px-3 flex justify-between items-center">
          <h2 className="text-sm font-semibold">{$("terminal.history")}</h2>
          <Button variant="ghost" size="icon" className="cursor-pointer h-7 w-7" onClick={() => setHistoryList([])}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Card className="dark:bg-transparent flex-1 rounded-sm p-1 flex flex-col gap-0 overflow-y-auto">
          {historyList.map((cmd, i) => (
            <Button
              variant="ghost"
              size="sm"
              className="block px-2 py-0 rounded-xs text-left text-nowrap text-ellipsis overflow-hidden cursor-pointer font-mono text-xs"
              onClick={() => {
                setCommand(cmd);
                if (inputRef.current) inputRef.current.value = cmd;
                inputRef.current?.focus();
              }}
              onDoubleClick={() => {
                setCommand(cmd);
                if (inputRef.current) inputRef.current.value = cmd;
                handleSend();
              }}
              key={i}>
              {cmd}
            </Button>
          ))}
        </Card>
      </div>
    </SubPage>
  );
}
