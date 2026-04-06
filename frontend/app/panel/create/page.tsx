"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { sendPostRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/navbar";
import { toast } from "sonner";

const SERVER_TYPES = ["PAPER", "SPIGOT", "FABRIC", "FORGE", "NEOFORGE", "FOLIA", "VANILLA"];
const MC_VERSIONS = [
  "26.1",
  "1.21.11", "1.21.10", "1.21.9", "1.21.8", "1.21.7", "1.21.6", "1.21.5",
  "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21",
  "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20",
  "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19",
  "1.18.2", "1.18.1", "1.18",
  "1.17.1", "1.17",
  "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1",
];
const MEMORY_OPTIONS = ["1G", "2G", "4G", "6G", "8G", "12G", "16G"];

export default function CreateServerPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("PAPER");
  const [mcVersion, setMcVersion] = useState("26.1");
  const [memory, setMemory] = useState("2G");
  const [gamePort, setGamePort] = useState(25565);
  const [rconPort, setRconPort] = useState(25575);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Server name is required");
      return;
    }

    setCreating(true);
    try {
      const server = await sendPostRequest<{ id: string }>("/api/servers", {
        name: name.trim(),
        type,
        mcVersion,
        memory,
        gamePort,
        rconPort,
      });
      router.push(`/panel/${server.id}/setup`);
    } catch (e: any) {
      toast.error("Failed to create server", { description: e.response?.data?.error || e.message });
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
    <Navbar />
    <div className="p-6 max-w-2xl mx-auto flex-1 overflow-auto">
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/panel")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to servers
      </Button>

      <h1 className="text-2xl font-bold mb-6">Create New Server</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Server Name</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Server"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Server Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Minecraft Version</label>
            <Select value={mcVersion} onValueChange={setMcVersion}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MC_VERSIONS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Memory</label>
          <Select value={memory} onValueChange={setMemory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Game Port</label>
            <Input
              type="number"
              value={gamePort}
              onChange={(e) => setGamePort(parseInt(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">RCON Port</label>
            <Input
              type="number"
              value={rconPort}
              onChange={(e) => setRconPort(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Server"
            )}
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}
