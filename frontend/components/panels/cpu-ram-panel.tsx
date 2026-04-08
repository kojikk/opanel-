"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Area, AreaChart, CartesianGrid, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { serverApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { MonitorSnapshot } from "./types";

const chartConfig = {
  memory: { label: "RAM (MB)" },
  cpu: { label: "CPU (%)" },
} satisfies ChartConfig;

type Range = "live" | "1h" | "24h" | "7d" | "30d";
const RANGES: Range[] = ["live", "1h", "24h", "7d", "30d"];

interface CpuRamPanelProps {
  history: MonitorSnapshot[];
}

export function CpuRamPanel({ history }: CpuRamPanelProps) {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);
  const [range, setRange] = useState<Range>("live");
  const [historicalData, setHistoricalData] = useState<{ cpu: number; memory: number }[]>([]);

  useEffect(() => {
    if (range === "live") return;
    let cancelled = false;
    api
      .metrics(range)
      .then((res) => {
        if (cancelled) return;
        setHistoricalData(res.points.map((p) => ({ cpu: p.cpu, memory: p.memory })));
      })
      .catch(() => {
        if (!cancelled) setHistoricalData([]);
      });
    return () => {
      cancelled = true;
    };
  }, [range, serverId]);

  const data =
    range === "live"
      ? history.map((d, i) => ({ idx: i, cpu: d.cpu, memory: d.memory }))
      : historicalData.map((d, i) => ({ idx: i, cpu: d.cpu, memory: d.memory }));

  const latest = data[data.length - 1] ?? { cpu: 0, memory: 0 };
  const maxMemory = Math.max(...data.map((d) => d.memory), 1);
  const memCeil = Math.ceil(maxMemory / 256) * 256;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">
          CPU {latest.cpu.toFixed(1)}% &middot; RAM {latest.memory} MB
        </span>
        <div className="flex gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-sm font-mono cursor-pointer",
                range === r
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No data for this range
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="w-full h-full">
            <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <YAxis yAxisId="cpu" hide domain={[0, 100]} />
              <YAxis yAxisId="memory" hide domain={[0, memCeil]} orientation="right" />
              <Area
                yAxisId="memory"
                dataKey="memory"
                type="monotone"
                fill="url(#fillMemory)"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Area
                yAxisId="cpu"
                dataKey="cpu"
                type="monotone"
                fill="url(#fillCpu)"
                stroke="var(--color-foreground)"
                strokeWidth={2}
                isAnimationActive={false}
              />
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
        )}
      </div>
    </div>
  );
}
