"use client";

import { useMemo, useCallback } from "react";
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor, type ResponsiveLayouts, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Server,
  Clock,
  Users,
  ChartLine,
  SquareTerminal,
  Gauge,
  Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PanelWrapper } from "./panel-wrapper";
import type { MonitorSnapshot } from "./types";
import { ServerInfoPanel } from "./server-info-panel";
import { UptimePanel } from "./uptime-panel";
import { PlayersPanel } from "./players-panel";
import { CpuRamPanel } from "./cpu-ram-panel";
import { ConsolePanel } from "./console-panel";
import { TpsPanel } from "./tps-panel";
import { SystemStatsPanel } from "./system-stats-panel";

const DRAG_CONFIG = { enabled: true, handle: ".panel-drag-handle" } as const;
const RESIZE_CONFIG = { enabled: true } as const;

interface PanelMeta {
  title: string;
  icon: LucideIcon;
  removable: boolean;
}

const PANEL_META: Record<string, PanelMeta> = {
  "server-info": { title: "Server Info", icon: Server, removable: false },
  uptime: { title: "Uptime", icon: Clock, removable: true },
  players: { title: "Players", icon: Users, removable: true },
  "cpu-ram": { title: "CPU / RAM", icon: ChartLine, removable: true },
  console: { title: "Console", icon: SquareTerminal, removable: true },
  tps: { title: "TPS", icon: Gauge, removable: true },
  "system-stats": { title: "System Stats", icon: Cpu, removable: true },
};

const BREAKPOINTS = { lg: 1200, md: 768, sm: 0 };
const COLS = { lg: 12, md: 8, sm: 1 };

interface PanelGridProps {
  layouts: ResponsiveLayouts;
  activePanels: string[];
  onLayoutChange: (layout: Layout, allLayouts: ResponsiveLayouts) => void;
  onRemovePanel: (id: string) => void;
  monitorHistory: MonitorSnapshot[];
  playersOnline: number;
  playersMax: number;
}

export function PanelGrid({
  layouts,
  activePanels,
  onLayoutChange,
  onRemovePanel,
  monitorHistory,
  playersOnline,
  playersMax,
}: PanelGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const latest = monitorHistory[monitorHistory.length - 1];

  const panelContent = useMemo(
    () => ({
      "server-info": <ServerInfoPanel />,
      uptime: <UptimePanel />,
      players: <PlayersPanel />,
      "cpu-ram": <CpuRamPanel history={monitorHistory} />,
      console: <ConsolePanel />,
      tps: <TpsPanel history={monitorHistory} />,
      "system-stats": (
        <SystemStatsPanel
          latest={latest}
          playersOnline={playersOnline}
          playersMax={playersMax}
        />
      ),
    }),
    [monitorHistory, latest, playersOnline, playersMax]
  );

  const handleLayoutChange = useCallback(
    (layout: Layout, allLayouts: ResponsiveLayouts) => {
      onLayoutChange(layout, allLayouts);
    },
    [onLayoutChange]
  );

  return (
    <div ref={containerRef}>
      {mounted && (
        <ResponsiveGridLayout
          className="panel-grid"
          width={width}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={50}
          onLayoutChange={handleLayoutChange}
          dragConfig={DRAG_CONFIG}
          resizeConfig={RESIZE_CONFIG}
          compactor={verticalCompactor}
          margin={[8, 8]}
        >
          {activePanels.map((id) => {
            const meta = PANEL_META[id];
            if (!meta) return null;
            return (
              <div key={id} className="group">
                <PanelWrapper
                  title={meta.title}
                  icon={meta.icon}
                  removable={meta.removable}
                  onRemove={() => onRemovePanel(id)}
                >
                  {panelContent[id as keyof typeof panelContent]}
                </PanelWrapper>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
