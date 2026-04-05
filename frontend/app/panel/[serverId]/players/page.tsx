"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Users,
  UserMinus,
  Shield,
  ShieldOff,
  Ban,
  Search,
  UserPlus,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { $ } from "@/lib/i18n";

interface WhitelistEntry {
  uuid: string;
  name: string;
}

export default function PlayersPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);

  const [players, setPlayers] = useState<string[]>([]);
  const [online, setOnline] = useState(0);
  const [max, setMax] = useState(0);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [whitelistInput, setWhitelistInput] = useState("");

  const fetchPlayers = async () => {
    try {
      const res = await api.players.list();
      setPlayers(res.players);
      setOnline(res.online);
      setMax(res.max);
    } catch { /* server may be offline */ }
  };

  const fetchWhitelist = async () => {
    try {
      const res = await api.whitelist.get() as WhitelistEntry[];
      setWhitelist(Array.isArray(res) ? res : []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchPlayers(), fetchWhitelist()]);
      setLoading(false);
    };
    load();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const handleAction = async (action: string, player: string, extra?: Record<string, string>) => {
    try {
      await api.players.action(action, player, extra);
      toast.success(`${action} executed for ${player}`);
      fetchPlayers();
    } catch {
      toast.error(`Failed to ${action} ${player}`);
    }
  };

  const handleWhitelistAdd = async () => {
    if (!whitelistInput.trim()) return;
    try {
      await api.whitelist.action("add", whitelistInput.trim());
      toast.success(`${whitelistInput.trim()} added to whitelist`);
      setWhitelistInput("");
      fetchWhitelist();
    } catch {
      toast.error("Failed to add to whitelist");
    }
  };

  const handleWhitelistRemove = async (name: string) => {
    try {
      await api.whitelist.action("remove", name);
      toast.success(`${name} removed from whitelist`);
      fetchWhitelist();
    } catch {
      toast.error("Failed to remove from whitelist");
    }
  };

  const filteredPlayers = players.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <SubPage
      title="Players"
      category={$("sidebar.server")}
      icon={<Users />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Whitelist ({whitelist.length})
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Whitelist Management</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Player name..."
                  value={whitelistInput}
                  onChange={(e) => setWhitelistInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleWhitelistAdd()}
                />
                <Button onClick={handleWhitelistAdd}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => api.whitelist.action("enable")}>
                  Enable
                </Button>
                <Button size="sm" variant="outline" onClick={() => api.whitelist.action("disable")}>
                  Disable
                </Button>
                <Button size="sm" variant="outline" onClick={() => { api.whitelist.action("reload"); fetchWhitelist(); }}>
                  Reload
                </Button>
              </div>
              <div className="space-y-1">
                {whitelist.map((entry) => (
                  <div key={entry.uuid} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://api.mineatar.io/face/${entry.uuid}?scale=2`}
                        alt={entry.name}
                        className="w-6 h-6 rounded-sm"
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleWhitelistRemove(entry.name)}>
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {whitelist.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Whitelist is empty</p>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs defaultValue="online">
        <TabsList>
          <TabsTrigger value="online">Online ({online}/{max})</TabsTrigger>
          <TabsTrigger value="banned">Banned</TabsTrigger>
        </TabsList>

        <TabsContent value="online">
          {filteredPlayers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.mineatar.io/face/${player}?scale=2`}
                          alt={player}
                          className="w-8 h-8 rounded-sm image-pixelated"
                        />
                        <span className="font-medium">{player}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleAction("kick", player)}>
                          <UserMinus className="h-3.5 w-3.5 mr-1" /> Kick
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleAction("op", player)}>
                          <Shield className="h-3.5 w-3.5 mr-1" /> OP
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleAction("deop", player)}>
                          <ShieldOff className="h-3.5 w-3.5 mr-1" /> Deop
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleAction("ban", player)}>
                          <Ban className="h-3.5 w-3.5 mr-1" /> Ban
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border rounded-lg p-12 text-center text-muted-foreground mt-4">
              {search ? "No matching players" : "No players online"}
            </div>
          )}
        </TabsContent>

        <TabsContent value="banned">
          <BannedPlayersTab serverId={serverId} />
        </TabsContent>
      </Tabs>
    </SubPage>
  );
}

function BannedPlayersTab({ serverId }: { serverId: string }) {
  const [bannedPlayers, setBannedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const api = serverApi(serverId);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.terminal.send("banlist players");
        const lines = res.result.split("\n");
        const names: string[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("There") && !trimmed.includes("banned")) {
            const parts = trimmed.split(/[:,]/);
            for (const part of parts) {
              const name = part.trim().replace(/\s*was banned.*/, "").trim();
              if (name && name.length > 1 && name.length < 20) names.push(name);
            }
          }
        }
        setBannedPlayers(names);
      } catch {
        // command might fail
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [serverId]);

  const handlePardon = async (player: string) => {
    try {
      await api.players.action("pardon", player);
      toast.success(`${player} pardoned`);
      setBannedPlayers((prev) => prev.filter((p) => p !== player));
    } catch {
      toast.error(`Failed to pardon ${player}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (bannedPlayers.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground mt-4">
        No banned players
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bannedPlayers.map((player) => (
          <TableRow key={player}>
            <TableCell>
              <div className="flex items-center gap-3">
                <img
                  src={`https://api.mineatar.io/face/${player}?scale=2`}
                  alt={player}
                  className="w-8 h-8 rounded-sm image-pixelated"
                />
                <span className="font-medium">{player}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => handlePardon(player)}>
                Pardon
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
