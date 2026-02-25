"use client";

import type { APIResponse, VersionResponse } from "@/lib/types";
import { useEffect, useState } from "react";
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

export default function ServerPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { serverId } = useParams<{ serverId: string }>();
  const [mounted, setMounted] = useState(false);
  const [versionInfo, setVersionInfo] = useState<APIResponse<VersionResponse>>();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!serverId) return;
    const fetchVersionInfo = async () => {
      try {
        const server = await sendGetRequest<any>(`/api/servers/${serverId}`);
        setVersionInfo({
          serverType: server.type || "PAPER",
          version: server.mcVersion || "1.21",
        } as any);
      } catch (error) {
        console.error("Error fetching server info:", error);
      }
    };
    fetchVersionInfo();
  }, [serverId]);

  useKeydown("a", { ctrl: true }, (e) => e.preventDefault());
  useKeydown("p", { ctrl: true }, (e) => e.preventDefault());
  useKeydown("s", { ctrl: true }, (e) => e.preventDefault());

  if (!mounted) return <></>;

  return (
    <SidebarProvider className="overflow-hidden">
      <VersionContext value={versionInfo}>
        <AppSidebar serverId={serverId} />
        <SidebarInset className="min-w-0">
          <Navbar serverId={serverId} />
          {children}
        </SidebarInset>
      </VersionContext>
    </SidebarProvider>
  );
}
