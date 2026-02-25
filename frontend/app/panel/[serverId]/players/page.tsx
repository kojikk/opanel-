"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, UserMinus, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlayerData {
  online: number;
  max: number;
  players: string[];
}

export default function PlayersPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const api = serverApi(serverId);

  const fetchPlayers = async () => {
    try {
      const res = await api.players.list();
      setData(res);
    } catch {
      // server may be offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  const handleAction = async (action: string, player: string) => {
    try {
      await api.players.action(action, player);
      toast.success(`${action} executed for ${player}`);
      fetchPlayers();
    } catch {
      toast.error(`Failed to ${action} ${player}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Players</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {data ? `${data.online} of ${data.max} online` : "Server offline"}
      </p>

      {data && data.players.length > 0 ? (
        <div className="grid gap-2">
          {data.players.map((player) => (
            <div key={player} className="border rounded-lg p-3 flex items-center justify-between">
              <span className="font-medium">{player}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleAction("kick", player)}>
                  <UserMinus className="h-3 w-3 mr-1" /> Kick
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAction("op", player)}>
                  <Shield className="h-3 w-3 mr-1" /> OP
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAction("deop", player)}>
                  <ShieldOff className="h-3 w-3 mr-1" /> Deop
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAction("ban", player)}>
                  Ban
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No players online
        </div>
      )}
    </div>
  );
}
