"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function GamerulesPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [rules, setRules] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const api = serverApi(serverId);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.gamerules.get() as Record<string, string>;
        setRules(res);
      } catch {
        toast.error("Failed to load gamerules");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [serverId]);

  const handleChange = async (key: string, value: string) => {
    try {
      await api.gamerules.set({ [key]: value });
      setRules((prev) => ({ ...prev, [key]: value }));
    } catch {
      toast.error("Failed to update gamerule");
    }
  };

  const filtered = Object.entries(rules).filter(([key]) =>
    key.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Game Rules</h1>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gamerules..."
          className="w-full border rounded-md pl-9 pr-3 py-2 bg-background text-sm"
        />
      </div>
      <div className="grid gap-1">
        {filtered.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between border rounded-md px-3 py-2">
            <span className="text-sm font-mono">{key}</span>
            {value === "true" || value === "false" ? (
              <button
                className={`px-3 py-1 rounded text-xs font-medium ${
                  value === "true" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                }`}
                onClick={() => handleChange(key, value === "true" ? "false" : "true")}
              >
                {value}
              </button>
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-24 text-right border rounded px-2 py-1 text-sm bg-background"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
