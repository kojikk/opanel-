"use client";

import type { ItemStack, PlayerInventory } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendPostRequest } from "@/lib/api-client";

export type InventoryStreamStatus = "connecting" | "open" | "error" | "closed";

/**
 * Live inventory transport: EventSource to the panel's SSE proxy route for
 * downstream init/update packets, plus a fetch POST for edits (the panel
 * bridges both to the plugin's WebSocket — the browser can't reach the
 * plugin port directly).
 */
export function useInventoryStream(serverId: string, uuid: string | null) {
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);
  const [status, setStatus] = useState<InventoryStreamStatus>("connecting");
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!serverId || !uuid) return;

    setStatus("connecting");
    setErrorCode(null);
    setInventory(null);

    const source = new EventSource(`/api/servers/${serverId}/players/${uuid}/inventory`);
    sourceRef.current = source;

    const handleData = (e: MessageEvent) => {
      try {
        setInventory(JSON.parse(e.data) as PlayerInventory);
        setStatus("open");
      } catch { /* ignore malformed frames */ }
    };

    source.addEventListener("init", handleData);
    source.addEventListener("update", handleData);
    source.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data ?? "null");
        if (typeof data?.code === "number") setErrorCode(data.code);
      } catch { /* transport-level error without payload */ }
      setStatus("error");
    });
    source.addEventListener("closed", () => {
      setStatus("closed");
      source.close();
    });
    source.onerror = () => {
      // EventSource transport failure (e.g. 401/409/502 response).
      setStatus("error");
      source.close();
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [serverId, uuid]);

  const sendUpdate = useCallback(async (item: ItemStack & { snbt?: string | null }) => {
    if (!serverId || !uuid) return;
    // The echoed "update" also arrives on the SSE stream; use the POST result
    // as an immediate optimistic refresh.
    const res = await sendPostRequest<{ inventory?: PlayerInventory }>(
      `/api/servers/${serverId}/players/${uuid}/inventory`,
      item
    );
    if (res?.inventory) setInventory(res.inventory);
  }, [serverId, uuid]);

  return { inventory, status, errorCode, sendUpdate };
}
