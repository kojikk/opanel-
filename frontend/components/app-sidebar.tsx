"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { Archive, Blocks, ClockFading, Earth, Gauge, PaintBucket, PencilRuler, ScrollText, SquareTerminal, Users, ArrowLeft } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarIndicator,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "./ui/sidebar";
import { cn, isBukkit } from "@/lib/utils";
import { minecraftAE } from "@/lib/fonts";
import { Logo } from "./logo";
import { VersionContext } from "@/contexts/api-context";
import { useServerPermissions } from "@/contexts/server-permissions-context";
import { P, type Permission } from "@/lib/auth/permissions";
import { $ } from "@/lib/i18n";

interface MenuItem {
  name: string;
  url: string;
  icon: typeof Gauge;
  permission: Permission;
}

function getMenuItems(serverId: string): {
  server: MenuItem[];
  management: MenuItem[];
  configuration: MenuItem[];
} {
  const base = `/panel/${serverId}`;
  return {
    server: [
      { name: $("sidebar.server.dashboard"), url: `${base}/dashboard`, icon: Gauge, permission: P.MONITOR_VIEW },
      { name: $("sidebar.server.saves"), url: `${base}/saves`, icon: Earth, permission: P.SAVES_VIEW },
      { name: $("sidebar.server.players"), url: `${base}/players`, icon: Users, permission: P.PLAYERS_VIEW },
    ],
    management: [
      { name: $("sidebar.management.gamerules"), url: `${base}/gamerules`, icon: PencilRuler, permission: P.GAMERULES_VIEW },
      { name: $("sidebar.management.plugins"), url: `${base}/plugins`, icon: Blocks, permission: P.PLUGINS_VIEW },
      { name: $("sidebar.management.terminal"), url: `${base}/terminal`, icon: SquareTerminal, permission: P.CONSOLE_VIEW },
      { name: $("sidebar.management.logs"), url: `${base}/logs`, icon: ScrollText, permission: P.LOGS_VIEW },
      // TODO: code-of-conduct page not yet implemented
      // { name: $("sidebar.management.code-of-conduct"), url: `${base}/code-of-conduct`, icon: HeartHandshake, minVersion: "1.21.9" },
    ],
    configuration: [
      { name: $("sidebar.config.tasks"), url: `${base}/tasks`, icon: ClockFading, permission: P.TASKS_VIEW },
      { name: $("sidebar.config.backups"), url: `${base}/backups`, icon: Archive, permission: P.BACKUP_VIEW },
      { name: $("sidebar.config.settings"), url: `${base}/settings`, icon: PaintBucket, permission: P.SETTINGS_VIEW },
    ],
  };
}

export function AppSidebar({ serverId }: { serverId?: string }) {
  const pathname = usePathname();
  const versionCtx = useContext(VersionContext);
  const { permissions, loading: permsLoading } = useServerPermissions();

  // While permissions are loading we render no items to avoid flashing
  // a section and then hiding it. OWNER/ADMIN get all permissions so
  // this only briefly affects restricted USERs.
  const canSee = (item: MenuItem) => !permsLoading && permissions.includes(item.permission);

  if (!serverId) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-12 pl-4 bg-transparent border-b border-b-sidebar-border flex flex-row items-center gap-0 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:pt-3 group-data-[state=collapsed]:pl-2">
          <Logo size={26}/>
          <h1 className={cn("m-2 text-lg text-theme font-semibold select-none group-data-[state=collapsed]:hidden", minecraftAE.className)}>OPanel</h1>
        </SidebarHeader>
        <SidebarContent className="bg-transparent" />
        <SidebarFooter className="p-4 bg-transparent items-end group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:items-center">
          <SidebarTrigger className="cursor-pointer"/>
        </SidebarFooter>
      </Sidebar>
    );
  }

  const allItems = getMenuItems(serverId);
  const items = {
    server: allItems.server.filter(canSee),
    management: allItems.management.filter(canSee),
    configuration: allItems.configuration.filter(canSee),
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-12 pl-4 bg-transparent border-b border-b-sidebar-border flex flex-row items-center gap-0 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:pt-3 group-data-[state=collapsed]:pl-2">
        <Logo size={26}/>
        <h1 className={cn("m-2 text-lg text-theme font-semibold select-none group-data-[state=collapsed]:hidden", minecraftAE.className)}>OPanel</h1>
      </SidebarHeader>
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/panel" className="pl-3">
                    <ArrowLeft />
                    <span className="whitespace-nowrap">All Servers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {items.server.length > 0 && <SidebarGroup>
          <SidebarGroupLabel>{$("sidebar.server")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.server.map((item, i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuButton isActive={pathname.startsWith(item.url)} asChild>
                    <Link href={item.url} className="pl-3">
                      {pathname.startsWith(item.url) && <SidebarIndicator className="left-2"/>}
                      <item.icon />
                      <span className="whitespace-nowrap">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}
        {items.management.length > 0 && <SidebarGroup>
          <SidebarGroupLabel>{$("sidebar.management")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.management.map((item, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuButton isActive={pathname.startsWith(item.url)} asChild>
                      <Link href={item.url} className="pl-3">
                        {pathname.startsWith(item.url) && <SidebarIndicator className="left-2"/>}
                        <item.icon />
                        <span className="whitespace-nowrap">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}
        {items.configuration.length > 0 && <SidebarGroup>
          <SidebarGroupLabel>{$("sidebar.config")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.configuration.map((item, i) => {
                if (item.url.includes("bukkit-config") && versionCtx && !isBukkit(versionCtx.serverType)) return null;
                return (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuButton isActive={pathname.startsWith(item.url)} asChild>
                      <Link href={item.url} className="pl-3">
                        {pathname.startsWith(item.url) && <SidebarIndicator className="left-2"/>}
                        <item.icon />
                        <span className="whitespace-nowrap">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}
      </SidebarContent>
      <SidebarFooter className="p-4 bg-transparent items-end group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:items-center">
        <SidebarTrigger className="cursor-pointer"/>
      </SidebarFooter>
    </Sidebar>
  );
}
