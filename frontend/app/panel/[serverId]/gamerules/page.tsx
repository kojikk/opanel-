"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PencilRuler, Search, Loader2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { $ } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function GamerulesPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);
  const [rules, setRules] = useState<Record<string, string>>({});
  const [modified, setModified] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = (await api.gamerules.get()) as Record<string, string>;
        setRules(res);
      } catch (e: any) {
        const msg = e.response?.data?.error || "Failed to load gamerules";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [serverId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modified]);

  const handleChange = (key: string, value: string) => {
    setModified((prev) => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    if (Object.keys(modified).length === 0) return;
    setSaving(true);
    try {
      await api.gamerules.set(modified);
      setRules((prev) => ({ ...prev, ...modified }));
      setModified({});
      toast.success("Gamerules saved");
    } catch {
      toast.error("Failed to save gamerules");
    } finally {
      setSaving(false);
    }
  };

  const saveSingle = async (key: string, value: string) => {
    try {
      await api.gamerules.set({ [key]: value });
      setRules((prev) => ({ ...prev, [key]: value }));
      setModified((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      toast.error(`Failed to update ${key}`);
    }
  };

  const getValue = (key: string) => (key in modified ? modified[key] : rules[key]);

  const filtered = Object.entries(rules).filter(([key]) =>
    key.toLowerCase().includes(search.toLowerCase())
  );

  const hasChanges = Object.keys(modified).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <SubPage
        title="Game Rules"
        category={$("sidebar.management")}
        icon={<PencilRuler />}
        hideNavbar
        className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true); window.location.reload(); }}>
            Retry
          </Button>
        </div>
      </SubPage>
    );
  }

  return (
    <SubPage
      title="Game Rules"
      category={$("sidebar.management")}
      icon={<PencilRuler />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gamerules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {hasChanges && (
          <Button onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save All ({Object.keys(modified).length})
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Ctrl+S to save all changes</p>

      <div className="grid gap-1">
        {filtered.map(([key]) => {
          const value = getValue(key);
          const isBoolean = rules[key] === "true" || rules[key] === "false";
          const isModified = key in modified;

          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between border rounded-md px-3 py-2",
                isModified && "border-primary/50 bg-primary/5"
              )}>
              <span className="text-sm font-mono">{key}</span>
              {isBoolean ? (
                <button
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors",
                    value === "true"
                      ? "bg-green-500/20 text-green-600 hover:bg-green-500/30"
                      : "bg-red-500/20 text-red-600 hover:bg-red-500/30"
                  )}
                  onClick={() => {
                    const newVal = value === "true" ? "false" : "true";
                    saveSingle(key, newVal);
                  }}>
                  {value}
                </button>
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(key, e.target.value)}
                  onBlur={() => {
                    if (isModified) saveSingle(key, modified[key]);
                  }}
                  className="w-24 text-right border rounded px-2 py-1 text-sm bg-background font-mono"
                />
              )}
            </div>
          );
        })}
      </div>
    </SubPage>
  );
}
