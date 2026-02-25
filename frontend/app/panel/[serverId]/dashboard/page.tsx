"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Gauge,
  Cpu,
  MemoryStick,
  Users,
  ChartLine,
  SquareTerminal,
  Server,
  Play,
  Square,
  RotateCw,
  Clock,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, YAxis } from "recharts";
import AnsiToHtml from "ansi-to-html";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { FunctionalCard } from "@/components/functional-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { $ } from "@/lib/i18n";
import { ServerContext } from "../layout";

const ansiConverter = new AnsiToHtml({ fg: "#aaa", bg: "transparent" });
const HISTORY_SIZE = 50;

interface MonitorSnapshot {
  cpu: number;
  memory: number;
  tps: number;
}

const monitorChartConfig = {
  memory: { label: "RAM (MB)" },
  cpu: { label: "CPU (%)" },
} satisfies ChartConfig;

const tpsChartConfig = {
  tps: { label: "TPS" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const serverCtx = useContext(ServerContext);
  const api = serverApi(serverId);

  const [monitorHistory, setMonitorHistory] = useState<MonitorSnapshot[]>(
    Array(HISTORY_SIZE).fill({ cpu: 0, memory: 0, tps: 20 })
  );
  const [players, setPlayers] = useState<{ online: number; max: number; players: string[] } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState(serverCtx?.status ?? "unknown");
  const [actionLoading, setActionLoading] = useState(false);
  const [uptime, setUptime] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const latestMonitor = monitorHistory[monitorHistory.length - 1];

  useEffect(() => {
    if (serverCtx?.status) setStatus(serverCtx.status);
  }, [serverCtx?.status]);

  useEffect(() => {
    const poll = async () => {
      try {
        const m = await api.monitor();
        setMonitorHistory((prev) => {
          const next = [...prev];
          next.shift();
          next.push({ cpu: m.cpu, memory: m.memory, tps: m.tps });
          return next;
        });
      } catch {
        // server may be offline
      }

      try {
        const p = await api.players.list();
        setPlayers(p);
      } catch {
        setPlayers(null);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  useEffect(() => {
    const timer = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(timer);
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
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const statusColor = status === "running"
    ? "bg-green-600"
    : status === "exited" ? "bg-red-700" : "bg-yellow-600";

  const monitorChartData = monitorHistory.map((d, i) => ({
    idx: i,
    cpu: d.cpu,
    memory: d.memory,
  }));
  const tpsChartData = monitorHistory.map((d, i) => ({
    idx: i,
    tps: d.tps,
  }));

  return (
    <SubPage
      title={$("dashboard.title")}
      category={$("sidebar.server")}
      icon={<Gauge />}
      hideNavbar
      className="flex-1 min-h-0 grid grid-rows-5 grid-cols-3 max-xl:grid-cols-2 max-lg:flex max-lg:flex-col gap-2 [&>*]:p-4">
      {/* Server Info Card */}
      <Card className={cn("row-start-1 col-span-2 flex flex-col rounded-sm shadow-none max-lg:gap-3")}>
        <div className="flex-1 flex max-md:flex-col gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{serverCtx?.name ?? "Server"}</h2>
              <Badge variant="outline" className="cursor-default">
                <div className={cn("w-2 h-2 rounded-full", statusColor)} />
                {status}
              </Badge>
            </div>
            {serverCtx?.description && (
              <p className="text-sm text-muted-foreground">{serverCtx.description}</p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mt-1">
              <div><span className="font-semibold">Type:</span> {serverCtx?.type ?? "—"}</div>
              <div><span className="font-semibold">Version:</span> {serverCtx?.mcVersion ?? "—"}</div>
              <div><span className="font-semibold">Port:</span> {serverCtx?.gamePort ?? "—"}</div>
              <div><span className="font-semibold">Memory:</span> {serverCtx?.memory ?? "—"}</div>
              <div><span className="font-semibold">Java:</span> {serverCtx?.javaVersion ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
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
      </Card>

      {/* Uptime + Players Count */}
      <FunctionalCard
        icon={Clock}
        title="Uptime"
        className="row-start-1"
        innerClassName="h-full px-4 pb-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold font-mono tabular-nums">{formatUptime(uptime)}</div>
          <span className="text-xs text-muted-foreground">Since page load</span>
        </div>
      </FunctionalCard>

      {/* Players Card */}
      <FunctionalCard
        icon={Users}
        title={`Players (${players?.online ?? 0} / ${players?.max ?? 0})`}
        moreLink={`/panel/${serverId}/players`}
        className="row-span-3 row-start-2"
        innerClassName="mr-1 mb-2 px-4 overflow-y-auto">
        {players && players.players.length > 0 ? (
          <div className="flex flex-col gap-1">
            {players.players.map((name) => (
              <div key={name} className="flex items-center gap-2 py-1.5 px-2 rounded-sm hover:bg-accent/50">
                <img
                  src={`https://api.mineatar.io/face/${name}?scale=2`}
                  alt={name}
                  className="w-6 h-6 rounded-sm image-pixelated"
                />
                <span className="text-sm font-medium">{name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No players online
          </div>
        )}
      </FunctionalCard>

      {/* Monitor Card (CPU / RAM) */}
      <FunctionalCard
        icon={ChartLine}
        title={`CPU ${latestMonitor.cpu.toFixed(1)}% · RAM ${latestMonitor.memory} MB`}
        className="row-span-3 row-start-2 justify-between"
        innerClassName="!overflow-hidden">
        <ChartContainer config={monitorChartConfig} className="w-full max-h-96">
          <AreaChart data={monitorChartData} margin={{ left: 0, right: 0, bottom: 80 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <Area
              dataKey="memory"
              type="monotone"
              fill="url(#fillMemory)"
              stroke="var(--color-chart-2)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              dataKey="cpu"
              type="monotone"
              fill="url(#fillCpu)"
              stroke="var(--color-foreground)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <YAxis hide domain={[0, 100]} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
            <defs>
              <linearGradient id="fillMemory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="var(--color-chart-2)" />
                <stop offset="90%" stopColor="var(--color-card)" />
              </linearGradient>
              <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="var(--color-foreground)" />
                <stop offset="90%" stopColor="var(--color-card)" />
              </linearGradient>
            </defs>
          </AreaChart>
        </ChartContainer>
      </FunctionalCard>

      {/* TPS Card */}
      <FunctionalCard
        icon={Server}
        title={`TPS ${latestMonitor.tps.toFixed(1)}`}
        className="row-start-5 justify-between"
        innerClassName="!overflow-hidden">
        <ChartContainer config={tpsChartConfig} className="w-full max-h-20">
          <AreaChart data={tpsChartData} margin={{ left: 0, right: 0, bottom: 20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <Area
              dataKey="tps"
              type="monotone"
              fill="transparent"
              stroke="var(--color-chart-3)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <YAxis hide domain={[0, 20]} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
          </AreaChart>
        </ChartContainer>
      </FunctionalCard>

      {/* System Stats Card */}
      <FunctionalCard
        icon={Cpu}
        title="System"
        className="row-start-5"
        innerClassName="h-full px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{latestMonitor.cpu.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">CPU</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{latestMonitor.memory} MB</div>
              <div className="text-xs text-muted-foreground">RAM</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{latestMonitor.tps.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">TPS</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{players?.online ?? 0}/{players?.max ?? 0}</div>
              <div className="text-xs text-muted-foreground">Players</div>
            </div>
          </div>
        </div>
      </FunctionalCard>

      {/* Mini Terminal */}
      <FunctionalCard
        icon={SquareTerminal}
        title="Console"
        moreLink={`/panel/${serverId}/terminal`}
        className="row-start-3 row-span-3 max-xl:row-start-6 max-xl:col-span-2"
        innerClassName="p-2 pt-0 h-full max-xl:h-96 flex flex-col gap-2 overflow-hidden">
        <div className="flex-1 overflow-auto bg-black text-white font-mono text-xs rounded-sm p-2">
          {logs.map((line, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(line) }} />
          ))}
          <div ref={logsEndRef} />
        </div>
        <MiniTerminalInput serverId={serverId} onResult={(cmd, result) => {
          setLogs((prev) => [...prev, `> ${cmd}`, ...(result ? [result] : [])]);
        }} />
      </FunctionalCard>
    </SubPage>
  );
}

function MiniTerminalInput({ serverId, onResult }: { serverId: string; onResult: (cmd: string, result: string) => void }) {
  const [command, setCommand] = useState("");
  const api = serverApi(serverId);

  const send = async () => {
    if (!command.trim()) return;
    try {
      const res = await api.terminal.send(command.trim());
      onResult(command.trim(), res.result);
    } catch {
      onResult(command.trim(), "Error: Failed to execute command");
    }
    setCommand("");
  };

  return (
    <input
      type="text"
      value={command}
      onChange={(e) => setCommand(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && send()}
      placeholder="Enter command..."
      className="w-full rounded-sm border px-3 py-1.5 text-sm font-mono bg-background"
    />
  );
}
