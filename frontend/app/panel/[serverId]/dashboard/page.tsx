"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, Cpu, MemoryStick, Gauge, Users } from "lucide-react";

interface MonitorData {
  cpu: number;
  memory: number;
  memoryLimit: number;
  memoryPercent: number;
  tps: number;
  mspt: number;
  isPaused: boolean;
}

interface PlayerData {
  online: number;
  max: number;
  players: string[];
}

export default function DashboardPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [players, setPlayers] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const api = serverApi(serverId);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [m, p] = await Promise.all([
          api.monitor(),
          api.players.list(),
        ]);
        setMonitor(m);
        setPlayers(p);
      } catch {
        // server may be offline
      } finally {
        setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Gauge className="h-5 w-5" />}
          label="TPS"
          value={monitor ? `${monitor.tps.toFixed(1)}` : "--"}
          sub={monitor ? `${monitor.mspt.toFixed(1)} MSPT` : ""}
        />
        <StatCard
          icon={<Cpu className="h-5 w-5" />}
          label="CPU"
          value={monitor ? `${monitor.cpu.toFixed(1)}%` : "--"}
        />
        <StatCard
          icon={<MemoryStick className="h-5 w-5" />}
          label="Memory"
          value={monitor ? `${monitor.memory} MB` : "--"}
          sub={monitor ? `/ ${monitor.memoryLimit} MB (${monitor.memoryPercent.toFixed(1)}%)` : ""}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Players"
          value={players ? `${players.online}/${players.max}` : "--"}
        />
      </div>

      {players && players.players.length > 0 && (
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Online Players</h2>
          <div className="flex flex-wrap gap-2">
            {players.players.map((name) => (
              <span key={name} className="px-3 py-1 bg-accent rounded-md text-sm">{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
