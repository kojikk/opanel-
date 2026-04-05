"use client";

import { useCallback, useState } from "react";
import type { Layout, ResponsiveLayouts } from "react-grid-layout";

export interface PanelDefinition {
  id: string;
  title: string;
  removable?: boolean;
}

// Bump this version when DEFAULT_LAYOUTS change to invalidate cached layouts
const LAYOUT_VERSION = 2;
const STORAGE_KEY_PREFIX = `opanel.dashboard-layout.v${LAYOUT_VERSION}`;
const ACTIVE_PANELS_KEY_PREFIX = `opanel.dashboard-panels.v${LAYOUT_VERSION}`;

// Per-panel size constraints: prevents square panels from becoming
// stretched/narrow and keeps charts at readable proportions.
// maxW/maxH are in grid units (lg: 12 cols, rowHeight: 50px).
const PANEL_CONSTRAINTS: Record<string, { minW: number; minH: number; maxW?: number; maxH?: number }> = {
  "server-info": { minW: 6, minH: 3, maxH: 5 },         // wide banner, not too tall
  uptime:        { minW: 2, minH: 2, maxW: 4, maxH: 4 }, // compact square-ish
  "system-stats": { minW: 3, minH: 3, maxW: 6, maxH: 5 }, // 2x2 grid, stays compact
  players:       { minW: 3, minH: 4, maxW: 6 },           // list, can grow tall
  "cpu-ram":     { minW: 3, minH: 4 },                    // chart, flexible
  tps:           { minW: 3, minH: 3 },                    // chart, flexible
  console:       { minW: 3, minH: 5 },                    // needs space for logs
};

function withConstraints(item: { i: string; x: number; y: number; w: number; h: number }) {
  const c = PANEL_CONSTRAINTS[item.i] ?? { minW: 2, minH: 2 };
  return { ...item, ...c };
}

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    // Row 1: Server Info (wide) + Uptime (compact)
    { i: "server-info", x: 0, y: 0, w: 8, h: 3 },
    { i: "uptime", x: 8, y: 0, w: 4, h: 3 },
    // Row 2: System Stats + CPU/RAM chart + Console (tall)
    { i: "system-stats", x: 0, y: 3, w: 4, h: 4 },
    { i: "cpu-ram", x: 4, y: 3, w: 4, h: 7 },
    { i: "console", x: 8, y: 3, w: 4, h: 11 },
    // Row 3: Players + TPS chart
    { i: "players", x: 0, y: 7, w: 4, h: 7 },
    { i: "tps", x: 4, y: 10, w: 4, h: 4 },
  ].map(withConstraints),
  md: [
    { i: "server-info", x: 0, y: 0, w: 6, h: 3 },
    { i: "uptime", x: 6, y: 0, w: 2, h: 3 },
    { i: "system-stats", x: 0, y: 3, w: 4, h: 4 },
    { i: "cpu-ram", x: 4, y: 3, w: 4, h: 6 },
    { i: "players", x: 0, y: 7, w: 4, h: 6 },
    { i: "console", x: 0, y: 13, w: 8, h: 7 },
    { i: "tps", x: 4, y: 9, w: 4, h: 4 },
  ].map(withConstraints),
  sm: [
    { i: "server-info", x: 0, y: 0, w: 1, h: 4 },
    { i: "uptime", x: 0, y: 4, w: 1, h: 3 },
    { i: "system-stats", x: 0, y: 7, w: 1, h: 4 },
    { i: "cpu-ram", x: 0, y: 11, w: 1, h: 6 },
    { i: "players", x: 0, y: 17, w: 1, h: 6 },
    { i: "console", x: 0, y: 23, w: 1, h: 7 },
    { i: "tps", x: 0, y: 30, w: 1, h: 4 },
  ].map(withConstraints),
};

const ALL_PANEL_IDS = [
  "server-info",
  "uptime",
  "players",
  "cpu-ram",
  "console",
  "tps",
  "system-stats",
];

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

export function usePanelLayout(serverId: string) {
  const layoutKey = `${STORAGE_KEY_PREFIX}.${serverId}`;
  const panelsKey = `${ACTIVE_PANELS_KEY_PREFIX}.${serverId}`;

  const [layouts, setResponsiveLayouts] = useState<ResponsiveLayouts>(() =>
    loadFromStorage(layoutKey, DEFAULT_LAYOUTS)
  );

  const [activePanels, setActivePanels] = useState<string[]>(() =>
    loadFromStorage(panelsKey, ALL_PANEL_IDS)
  );

  const onLayoutChange = useCallback(
    (_layout: Layout, allResponsiveLayouts: ResponsiveLayouts) => {
      setResponsiveLayouts(allResponsiveLayouts);
      saveToStorage(layoutKey, allResponsiveLayouts);
    },
    [layoutKey]
  );

  const addPanel = useCallback(
    (panelId: string) => {
      if (activePanels.includes(panelId)) return;
      const next = [...activePanels, panelId];
      setActivePanels(next);
      saveToStorage(panelsKey, next);

      // Add layout entry for the new panel at the bottom
      const newResponsiveLayouts = { ...layouts };
      for (const bp of Object.keys(DEFAULT_LAYOUTS)) {
        const defaultItem = DEFAULT_LAYOUTS[bp]?.find((l) => l.i === panelId);
        if (defaultItem) {
          const existing = newResponsiveLayouts[bp] || [];
          if (!existing.find((l) => l.i === panelId)) {
            const maxY = existing.reduce((m, l) => Math.max(m, l.y + l.h), 0);
            newResponsiveLayouts[bp] = [...existing, { ...defaultItem, y: maxY }];
          }
        }
      }
      setResponsiveLayouts(newResponsiveLayouts);
      saveToStorage(layoutKey, newResponsiveLayouts);
    },
    [activePanels, layouts, layoutKey, panelsKey]
  );

  const removePanel = useCallback(
    (panelId: string) => {
      const next = activePanels.filter((id) => id !== panelId);
      setActivePanels(next);
      saveToStorage(panelsKey, next);
    },
    [activePanels, panelsKey]
  );

  const resetLayout = useCallback(() => {
    setResponsiveLayouts(DEFAULT_LAYOUTS);
    setActivePanels(ALL_PANEL_IDS);
    saveToStorage(layoutKey, DEFAULT_LAYOUTS);
    saveToStorage(panelsKey, ALL_PANEL_IDS);
  }, [layoutKey, panelsKey]);

  // Filter layouts to only include active panels
  const filteredResponsiveLayouts: ResponsiveLayouts = {};
  for (const bp of Object.keys(layouts)) {
    filteredResponsiveLayouts[bp] = (layouts[bp] || []).filter((l) =>
      activePanels.includes(l.i)
    );
  }

  return {
    layouts: filteredResponsiveLayouts,
    activePanels,
    allPanelIds: ALL_PANEL_IDS,
    onLayoutChange,
    addPanel,
    removePanel,
    resetLayout,
  };
}
