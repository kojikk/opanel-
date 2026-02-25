"use client";

import type { APIResponse, ServerType, VersionResponse } from "@/lib/types";
import { createContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar";
import { VersionContext } from "@/contexts/api-context";
import { sendGetRequest } from "@/lib/api-client";
import { useKeydown } from "@/hooks/use-keydown";
import { Navbar } from "@/components/navbar";

export interface ServerContextData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  mcVersion: string;
  gamePort: number;
  rconPort: number;
  pluginPort: number;
  memory: string;
  javaVersion: string;
  autoStart: boolean;
  pluginInstalled: boolean;
  status: string;
}

export const ServerContext = createContext<ServerContextData | null>(null);

export default function ServerPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { serverId } = useParams<{ serverId: string }>();
  const [mounted, setMounted] = useState(false);
  const [versionInfo, setVersionInfo] = useState<APIResponse<VersionResponse>>();
  const [serverData, setServerData] = useState<ServerContextData | null>(null);

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

  useKeydown("a", { ctrl: true }, (e) => e.preventDefault());
  useKeydown("p", { ctrl: true }, (e) => e.preventDefault());
  useKeydown("s", { ctrl: true }, (e) => e.preventDefault());

  if (!mounted) return <></>;

  return (
    <SidebarProvider className="overflow-hidden">
      <VersionContext value={versionInfo}>
        <ServerContext value={serverData}>
          <AppSidebar serverId={serverId} />
          <SidebarInset className="min-w-0 max-h-screen overflow-hidden">
            <Navbar serverId={serverId} />
            {children}
          </SidebarInset>
        </ServerContext>
      </VersionContext>
    </SidebarProvider>
  );
}
