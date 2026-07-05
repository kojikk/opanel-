"use client";

import type { PropsWithChildren } from "react";
import { useContext } from "react";
import Link from "next/link";
import { Backpack } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SkinViewer } from "@/components/skin-viewer";
import { OnlineBadge } from "@/components/online-badge";
import { ServerContext } from "../layout";
import { $ } from "@/lib/i18n";

/**
 * Player detail sheet: 3D skin plus a link to the inventory editor.
 * The inventory editor requires the companion plugin — when it is not
 * installed a clear empty state is shown instead of the link.
 */
export function PlayerSheet({
  serverId,
  name,
  uuid,
  children,
  asChild
}: PropsWithChildren & {
  serverId: string
  name: string
  uuid: string | null
  asChild?: boolean
}) {
  const serverCtx = useContext(ServerContext);
  const pluginInstalled = serverCtx?.pluginInstalled ?? false;

  return (
    <Sheet>
      <SheetTrigger asChild={asChild}>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{$("players.edit.title")}</SheetTitle>
          <SheetDescription>{$("players.edit.description")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-4 flex flex-col gap-5">
          <SkinViewer name={name} uuid={uuid ?? ""}/>
          <div className="flex justify-center items-center gap-2">
            <OnlineBadge isOnline/>
            <h2 className="inline-block text-lg font-semibold">{name}</h2>
          </div>
          {pluginInstalled && uuid ? (
            <Button variant="outline" title={$("players.action.edit-inventory")} asChild>
              <Link href={`/panel/${serverId}/players/inventory?uuid=${uuid}`}>
                <Backpack />
                {$("players.action.edit-inventory")}
              </Link>
            </Button>
          ) : (
            <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
              {!pluginInstalled
                ? "Inventory editing requires the companion plugin."
                : "Player UUID unavailable — inventory editing is disabled."}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
