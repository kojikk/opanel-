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
  tps: { label: "TPS" },
} satisfies ChartConfig;

interface TpsPanelProps {
  history: MonitorSnapshot[];
}

export function TpsPanel({ history }: TpsPanelProps) {
  const latest = history[history.length - 1];
  const data = history.map((d, i) => ({ idx: i, tps: d.tps }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 text-xs text-muted-foreground shrink-0">
        TPS {latest.tps.toFixed(1)}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
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
      </div>
    </div>
  );
}
