"use client";

import type { Item } from "minecraft-textures";
import type { ItemStack } from "@/lib/types";
import { Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Backpack, Loader2, PlugZap, WifiOff } from "lucide-react";
import { SubPage } from "../../../sub-page";
import { ServerContext } from "../../layout";
import { InventoryContext } from "@/contexts/inventory-context";
import { InventoryContent } from "./inventory-content";
import { ItemExplorer } from "./item-explorer";
import { VersionContext } from "@/contexts/api-context";
import { getTextures } from "@/lib/texture";
import { AIR, InventoryItem } from "./inventory-item";
import { useInventoryStream } from "@/hooks/use-inventory-stream";
import { $ } from "@/lib/i18n";

export default function InventoryPage() {
  return (
    <Suspense>
      <Inventory />
    </Suspense>
  );
}

function Inventory() {
  const { serverId } = useParams<{ serverId: string }>();
  const searchParams = useSearchParams();
  const uuid = searchParams.get("uuid");
  const { push } = useRouter();
  const serverCtx = useContext(ServerContext);
  const versionCtx = useContext(VersionContext);
  const [textures, setTextures] = useState<Item[] | null>(null);
  const [currentlyHeldItem, setCurrentlyHeldItem] = useState<ItemStack | null>(null);
  const [nbtEditMode, setNbtEditMode] = useState(false);
  const heldItemElemRef = useRef<HTMLDivElement | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { inventory, status, errorCode, sendUpdate } = useInventoryStream(serverId, uuid);

  // Get textures by mc version
  useEffect(() => {
    if (!versionCtx) return;
    getTextures(versionCtx.version).then(setTextures);
  }, [versionCtx]);

  const positionHeldItemCountainer = () => {
    if (!heldItemElemRef.current) return;

    const heldItemElem = heldItemElemRef.current;
    const rect = heldItemElem.getBoundingClientRect();
    heldItemElem.style.top = `${mousePositionRef.current.y - rect.height / 2}px`;
    heldItemElem.style.left = `${mousePositionRef.current.x - rect.width / 2}px`;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    positionHeldItemCountainer();
  }, []);

  const minusHeldItemCount = (count: number) => {
    if (!currentlyHeldItem) return;

    const newCount = currentlyHeldItem.count - count;
    if (newCount <= 0) {
      setCurrentlyHeldItem(null);
      return;
    }
    setCurrentlyHeldItem({ ...currentlyHeldItem, count: newCount });
  };

  const swapClickedWithHeldItem = (clickedItem: ItemStack) => {
    setCurrentlyHeldItem(clickedItem.id === AIR ? null : clickedItem);
    if (currentlyHeldItem) sendUpdate({ ...currentlyHeldItem, slot: clickedItem.slot });
  };

  const addClickedWithHeldItem = (clickedItem: ItemStack, count: number) => {
    minusHeldItemCount(count);
    sendUpdate({ ...clickedItem, count: clickedItem.count + count });
  };

  const removeClickedItem = ({ slot }: ItemStack) => {
    sendUpdate({ id: AIR, count: 0, slot, snbt: undefined });
  };

  const halfClickedItem = (clickedItem: ItemStack) => {
    sendUpdate({ ...clickedItem, count: Math.floor(clickedItem.count / 2) });
  };

  const updateItemNBT = (item: ItemStack, snbt: string) => {
    sendUpdate({ ...item, snbt });
  };

  // Update held item position as soon as it is picked up
  useEffect(() => {
    positionHeldItemCountainer();
  }, [currentlyHeldItem]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  useEffect(() => {
    if (!uuid) push(`/panel/${serverId}/players`);
  }, [uuid, push, serverId]);

  if (!uuid) return <></>;

  const wrap = (content: React.ReactNode) => (
    <SubPage
      title="Players"
      subTitle={$("players.inventory.title")}
      description={$("players.inventory.description")}
      category={$("sidebar.server")}
      icon={<Backpack />}
      hideNavbar
      pageClassName="min-xl:px-64!"
      className="min-h-0 h-full flex gap-4 max-lg:flex-col max-lg:items-center">
      {content}
    </SubPage>
  );

  // Requires the companion plugin
  if (serverCtx && !serverCtx.pluginInstalled) {
    return wrap(
      <div className="flex-1 border rounded-lg p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <PlugZap className="h-8 w-8" />
        <p className="text-sm">Requires the companion plugin. Install it to view and edit player inventories.</p>
      </div>
    );
  }

  // Stream failed — visible error state, no infinite spinner.
  if (status === "error" || status === "closed") {
    return wrap(
      <div className="flex-1 border rounded-lg p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <WifiOff className="h-8 w-8" />
        <p className="text-sm">
          {errorCode === 404
            ? $("players.inventory.ws.error.404")
            : "Could not connect to the player inventory stream. Make sure the server is running and the player is online."}
        </p>
      </div>
    );
  }

  if (!versionCtx || !textures || !inventory) {
    return wrap(
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return wrap(
    <InventoryContext.Provider value={{
      textures,
      currentlyHeldItem,
      setCurrentlyHeldItem,
      nbtEditMode,
      setNbtEditMode,
      swapClickedWithHeldItem,
      addClickedWithHeldItem,
      removeClickedItem,
      halfClickedItem,
      updateItemNBT
    }}>
      <InventoryContent inventory={inventory}/>
      <ItemExplorer className="flex-1 w-full"/>
      {currentlyHeldItem && (
        <InventoryItem
          itemStack={currentlyHeldItem}
          held
          className="fixed top-0 left-0 bg-transparent!"
          ref={heldItemElemRef}/>
      )}
    </InventoryContext.Provider>
  );
}
