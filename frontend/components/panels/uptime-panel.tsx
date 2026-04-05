"use client";

import { useEffect, useState } from "react";

export function UptimePanel() {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const sec = uptime % 60;
  const formatted = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-3xl font-bold font-mono tabular-nums">{formatted}</div>
        <span className="text-xs text-muted-foreground">Since page load</span>
      </div>
    </div>
  );
}
