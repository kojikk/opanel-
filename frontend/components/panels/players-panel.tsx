"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayersPanelProps {
  players?: string[];
  online?: number;
  max?: number;
}

export function PlayersPanel({ players: playersList, online, max }: PlayersPanelProps) {
  const { serverId } = useParams<{ serverId: string }>();
  const players = playersList ? { online: online ?? 0, max: max ?? 0, players: playersList } : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
        <span className="text-xs text-muted-foreground">
          {players?.online ?? 0} / {players?.max ?? 0} online
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" asChild>
          <Link href={`/panel/${serverId}/players`}>
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2">
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
      </div>
    </div>
  );
}
