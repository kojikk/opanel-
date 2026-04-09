"use client";

import type { APIResponse, ServerType, VersionResponse } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar";
import { VersionContext } from "@/contexts/api-context";
import { ServerContext, type ServerContextData } from "@/contexts/server-context";
import {
  ServerPermissionsContext,
  SECTION_PERMISSIONS,
  sectionFromPath,
} from "@/contexts/server-permissions-context";
import type { Permission } from "@/lib/auth/permissions";
import { sendGetRequest } from "@/lib/api-client";
import { useKeydown } from "@/hooks/use-keydown";
import { Navbar } from "@/components/navbar";
import { NoAccess } from "@/components/no-access";
import { Loader2 } from "lucide-react";

// Ordered list of sections as they appear in the sidebar — used to pick
// a fallback landing section when the user lacks dashboard access.
const SIDEBAR_SECTION_ORDER = [
  "dashboard",
  "saves",
  "players",
  "gamerules",
  "plugins",
  "terminal",
  "logs",
  "tasks",
  "backups",
  "settings",
];

export default function ServerPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { serverId } = useParams<{ serverId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [versionInfo, setVersionInfo] = useState<APIResponse<VersionResponse>>();
  const [serverData, setServerData] = useState<ServerContextData | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!serverId) return;
    const fetchServerInfo = async () => {
      try {
        const server = await sendGetRequest<ServerContextData>(`/api/servers/${serverId}`);
        setServerData(server);
        setVersionInfo({
          serverType: (server.type || "Paper").toUpperCase() as ServerType,
          version: server.mcVersion || "1.21",
        } as APIResponse<VersionResponse>);
      } catch (error) {
        console.error("Error fetching server info:", error);
      }
    };
    fetchServerInfo();
  }, [serverId]);

  useEffect(() => {
    if (!serverId) return;
    setPermsLoading(true);
    sendGetRequest<{ permissions: Permission[] }>(`/api/servers/${serverId}/permissions`)
      .then((res) => setPermissions(res.permissions ?? []))
      .catch(() => setPermissions([]))
      .finally(() => setPermsLoading(false));
  }, [serverId]);

  useKeydown("a", { ctrl: true }, (e) => e.preventDefault());
  useKeydown("p", { ctrl: true }, (e) => e.preventDefault());
  useKeydown("s", { ctrl: true }, (e) => e.preventDefault());

  const section = sectionFromPath(pathname);
  const requiredPermission = section ? SECTION_PERMISSIONS[section] : undefined;
  const hasAccess = !requiredPermission || permissions.includes(requiredPermission);

  // If the user lands on the default dashboard without access, redirect to
  // the first accessible sidebar section instead of showing "no access".
  useEffect(() => {
    if (permsLoading || !serverId) return;
    if (section !== "dashboard") return;
    if (permissions.includes(SECTION_PERMISSIONS.dashboard)) return;

    const fallback = SIDEBAR_SECTION_ORDER.find(
      (s) => s !== "dashboard" && permissions.includes(SECTION_PERMISSIONS[s]),
    );
    if (fallback) {
      router.replace(`/panel/${serverId}/${fallback}`);
    }
  }, [permsLoading, permissions, section, serverId, router]);

  const permissionsCtx = useMemo(
    () => ({ permissions, loading: permsLoading }),
    [permissions, permsLoading],
  );

  if (!mounted) return <></>;

  const hasAnyAccess = SIDEBAR_SECTION_ORDER.some((s) => permissions.includes(SECTION_PERMISSIONS[s]));

  return (
    <SidebarProvider className="overflow-hidden">
      <VersionContext value={versionInfo}>
        <ServerContext value={serverData}>
          <ServerPermissionsContext value={permissionsCtx}>
            <AppSidebar serverId={serverId} />
            <SidebarInset className="min-w-0 max-h-screen overflow-hidden">
              <Navbar serverId={serverId} />
              {permsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !hasAnyAccess ? (
                <NoAccess message="You don't have access to any sections of this server. Contact an administrator to request access." />
              ) : hasAccess ? (
                children
              ) : (
                <NoAccess />
              )}
            </SidebarInset>
          </ServerPermissionsContext>
        </ServerContext>
      </VersionContext>
    </SidebarProvider>
  );
}
