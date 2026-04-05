"use client";

import { Area, AreaChart, CartesianGrid, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonitorSnapshot } from "./types";

const chartConfig = {
  memory: { label: "RAM (MB)" },
  cpu: { label: "CPU (%)" },
} satisfies ChartConfig;

interface CpuRamPanelProps {
  history: MonitorSnapshot[];
}

export function CpuRamPanel({ history }: CpuRamPanelProps) {
  const latest = history[history.length - 1];
  const data = history.map((d, i) => ({ idx: i, cpu: d.cpu, memory: d.memory }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 text-xs text-muted-foreground shrink-0">
        CPU {latest.cpu.toFixed(1)}% &middot; RAM {latest.memory} MB
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
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
      </div>
    </div>
  );
}
