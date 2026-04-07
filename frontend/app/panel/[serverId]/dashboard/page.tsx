"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Gauge, RotateCcw } from "lucide-react";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import { PanelGrid } from "@/components/panels/panel-grid";
import { PanelPicker } from "@/components/panels/panel-picker";
import { usePanelLayout } from "@/hooks/use-panel-layout";
import { $ } from "@/lib/i18n";
import type { MonitorSnapshot } from "@/components/panels/types";

const HISTORY_SIZE = 50;

export default function DashboardPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);

  const {
    layouts,
    activePanels,
    onLayoutChange,
    addPanel,
    removePanel,
    resetLayout,
  } = usePanelLayout(serverId);

  const [monitorHistory, setMonitorHistory] = useState<MonitorSnapshot[]>(
    Array(HISTORY_SIZE).fill({ cpu: 0, memory: 0, tps: 20 })
  );
  const [players, setPlayers] = useState<{ online: number; max: number; players: string[] } | null>(null);

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
      } catch { /* server offline */ }

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

  return (
    <SubPage
      title={$("dashboard.title")}
      category={$("sidebar.server")}
      icon={<Gauge />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col"
      actions={
        <div className="flex items-center gap-2">
          <PanelPicker activePanels={activePanels} onAdd={addPanel} />
          <Button variant="ghost" size="sm" onClick={resetLayout}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
        </div>
      }
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <PanelGrid
          layouts={layouts}
          activePanels={activePanels}
          onLayoutChange={onLayoutChange}
          onRemovePanel={removePanel}
          monitorHistory={monitorHistory}
          playersOnline={players?.online ?? 0}
          playersMax={players?.max ?? 0}
          playersList={players?.players ?? []}
        />
      </div>
    </SubPage>
  );
}
