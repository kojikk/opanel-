"use client";

import {
  Cpu,
  Users,
  ChartLine,
  SquareTerminal,
  Server,
  Clock,
  Gauge,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PanelInfo {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const PANEL_CATALOG: PanelInfo[] = [
  { id: "server-info", title: "Server Info", description: "Server name, status, MOTD, and quick actions", icon: Server },
  { id: "uptime", title: "Uptime", description: "Server uptime counter", icon: Clock },
  { id: "players", title: "Players", description: "Online players list", icon: Users },
  { id: "cpu-ram", title: "CPU / RAM", description: "Real-time CPU and memory chart", icon: ChartLine },
  { id: "console", title: "Console", description: "Mini terminal with log output", icon: SquareTerminal },
  { id: "tps", title: "TPS", description: "Server TPS chart", icon: Gauge },
  { id: "system-stats", title: "System Stats", description: "CPU, RAM, TPS, player count overview", icon: Cpu },
];

interface PanelPickerProps {
  activePanels: string[];
  onAdd: (id: string) => void;
}

export function PanelPicker({ activePanels, onAdd }: PanelPickerProps) {
  const inactivePanels = PANEL_CATALOG.filter(
    (p) => !activePanels.includes(p.id)
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={inactivePanels.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          Add Panel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Panel</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 max-h-80 overflow-y-auto">
          {inactivePanels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              All panels are already active.
            </p>
          ) : (
            inactivePanels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => onAdd(panel.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-left",
                  "hover:bg-glass-hover transition-colors cursor-pointer",
                  "border border-transparent hover:border-glass-border"
                )}
              >
                <panel.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{panel.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {panel.description}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
