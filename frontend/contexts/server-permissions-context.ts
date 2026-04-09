"use client";

import { createContext, useContext } from "react";
import { P, type Permission } from "@/lib/auth/permissions";

export interface ServerPermissionsContextData {
  permissions: Permission[];
  loading: boolean;
}

export const ServerPermissionsContext = createContext<ServerPermissionsContextData>({
  permissions: [],
  loading: true,
});

export function useServerPermissions(): ServerPermissionsContextData {
  return useContext(ServerPermissionsContext);
}

/** Returns true if the current user has `permission` on the current server. */
export function useHasPermission(permission: Permission): boolean {
  const { permissions } = useServerPermissions();
  return permissions.includes(permission);
}

/**
 * Maps a sidebar section (the path segment after `/panel/[serverId]/`)
 * to the permission required to view it. Sections not listed here
 * (e.g. `setup`) are always accessible.
 */
export const SECTION_PERMISSIONS: Record<string, Permission> = {
  dashboard: P.MONITOR_VIEW,
  saves: P.SAVES_VIEW,
  players: P.PLAYERS_VIEW,
  gamerules: P.GAMERULES_VIEW,
  plugins: P.PLUGINS_VIEW,
  terminal: P.CONSOLE_VIEW,
  logs: P.LOGS_VIEW,
  tasks: P.TASKS_VIEW,
  backups: P.BACKUP_VIEW,
  settings: P.SETTINGS_VIEW,
};

/** Extract the section segment from a /panel/[serverId]/<section>/... pathname. */
export function sectionFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/panel\/[^/]+\/([^/]+)/);
  return m ? m[1] : null;
}
