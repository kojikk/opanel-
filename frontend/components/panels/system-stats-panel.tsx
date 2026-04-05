"use client";

import { Cpu, MemoryStick, Gauge, Users } from "lucide-react";
import type { MonitorSnapshot } from "./types";

interface SystemStatsPanelProps {
  latest: MonitorSnapshot;
  playersOnline: number;
  playersMax: number;
}

export function SystemStatsPanel({ latest, playersOnline, playersMax }: SystemStatsPanelProps) {
  return (
    <div className="h-full flex items-center p-4">
      <div className="grid grid-cols-2 gap-3 text-sm w-full">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{latest.cpu.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">CPU</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MemoryStick className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{latest.memory} MB</div>
            <div className="text-xs text-muted-foreground">RAM</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{latest.tps.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">TPS</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{playersOnline}/{playersMax}</div>
            <div className="text-xs text-muted-foreground">Players</div>
          </div>
        </div>
      </div>
    </div>
  );
}
