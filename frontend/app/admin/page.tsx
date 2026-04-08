"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Users, MonitorCog, Trash2, LogOut, KeyRound, Plus, X, Settings } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/navbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { sendGetRequest, sendPostRequest, sendPatchRequest, sendDeleteRequest } from "@/lib/api-client";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { PanelSettingsTab } from "./panel-settings-tab";

// Must match lib/auth/permissions.ts PERMISSION_GROUPS
const PERMISSION_GROUPS = [
  {
    label: "Server",
    permissions: [
      { key: "server.view", label: "View server" },
      { key: "server.start", label: "Start / Stop / Restart" },
      { key: "server.stop", label: "Stop server" },
      { key: "server.delete", label: "Delete server" },
      { key: "server.create", label: "Create servers" },
    ],
  },
  {
    label: "Console",
    permissions: [
      { key: "console.view", label: "View console output" },
      { key: "console.execute", label: "Execute commands" },
    ],
  },
  {
    label: "Players",
    permissions: [
      { key: "players.view", label: "View player list" },
      { key: "players.kick", label: "Kick players" },
      { key: "players.ban", label: "Ban / Pardon players" },
      { key: "players.gamemode", label: "Change gamemode" },
      { key: "players.op", label: "Op / Deop players" },
      { key: "players.inventory", label: "View / Edit inventory" },
    ],
  },
  {
    label: "Whitelist",
    permissions: [
      { key: "whitelist.view", label: "View whitelist" },
      { key: "whitelist.manage", label: "Manage whitelist" },
    ],
  },
  {
    label: "Plugins",
    permissions: [
      { key: "plugins.view", label: "View plugins" },
      { key: "plugins.upload", label: "Upload plugins" },
      { key: "plugins.toggle", label: "Enable / Disable plugins" },
      { key: "plugins.delete", label: "Delete plugins" },
    ],
  },
  {
    label: "Saves",
    permissions: [
      { key: "saves.view", label: "View worlds" },
      { key: "saves.delete", label: "Delete worlds" },
    ],
  },
  {
    label: "Logs",
    permissions: [
      { key: "logs.view", label: "View logs" },
      { key: "logs.delete", label: "Delete logs" },
    ],
  },
  {
    label: "Tasks",
    permissions: [
      { key: "tasks.view", label: "View scheduled tasks" },
      { key: "tasks.manage", label: "Create / Edit / Delete tasks" },
    ],
  },
  {
    label: "Gamerules",
    permissions: [
      { key: "gamerules.view", label: "View gamerules" },
      { key: "gamerules.edit", label: "Edit gamerules" },
    ],
  },
  {
    label: "Settings",
    permissions: [
      { key: "settings.view", label: "View config files" },
      { key: "settings.edit", label: "Edit config files" },
    ],
  },
  {
    label: "Icon & MOTD",
    permissions: [
      { key: "icon.view", label: "View icon / MOTD" },
      { key: "icon.edit", label: "Change icon / MOTD" },
    ],
  },
  {
    label: "Monitoring",
    permissions: [
      { key: "monitor.view", label: "View CPU / RAM / TPS" },
    ],
  },
];

interface UserInfo {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  _count: { sessions: number; serverAccess: number };
}

interface SessionInfo {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  user: { id: string; username: string; role: string };
}

interface ServerInfo {
  id: string;
  name: string;
}

interface AccessEntry {
  id: string;
  serverId: string;
  permissions: string[];
  server: { id: string; name: string };
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ADMIN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  USER: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function AdminPage() {
  const currentUser = useCheckAuth();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // User management state
  const [deleteTarget, setDeleteTarget] = useState<UserInfo | null>(null);

  // Access editor state
  const [accessUser, setAccessUser] = useState<UserInfo | null>(null);
  const [accessEntries, setAccessEntries] = useState<AccessEntry[]>([]);
  const [allServers, setAllServers] = useState<ServerInfo[]>([]);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<{ serverId: string; permissions: string[] } | null>(null);
  const [addServerOpen, setAddServerOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setUsers(await sendGetRequest("/api/admin/users"));
    } catch { /* handled by api-client */ }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setSessions(await sendGetRequest("/api/admin/sessions"));
    } catch { /* handled by api-client */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchSessions()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchSessions]);

  const changeRole = async (userId: string, role: string) => {
    try {
      await sendPatchRequest(`/api/admin/users/${userId}`, { role });
      toast.success("Role updated");
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to update role");
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await sendDeleteRequest(`/api/admin/users/${userId}`);
      toast.success("User deleted");
      setDeleteTarget(null);
      fetchUsers();
      fetchSessions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to delete user");
    }
  };

  const revokeSession = async (userId: string, sessionId: string) => {
    try {
      await sendDeleteRequest(`/api/admin/users/${userId}/sessions`, { sessionId });
      toast.success("Session revoked");
      fetchSessions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to revoke session");
    }
  };

  const revokeAllSessions = async (userId: string) => {
    try {
      await sendDeleteRequest(`/api/admin/users/${userId}/sessions`, { all: true });
      toast.success("All sessions revoked");
      fetchSessions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to revoke sessions");
    }
  };

  // Access management
  const openAccessEditor = async (user: UserInfo) => {
    setAccessUser(user);
    try {
      const [access, servers] = await Promise.all([
        sendGetRequest<AccessEntry[]>(`/api/admin/users/${user.id}/access`),
        sendGetRequest<ServerInfo[]>("/api/servers"),
      ]);
      setAccessEntries(access);
      setAllServers(servers);
      setPermDialogOpen(true);
    } catch (e: any) {
      toast.error("Failed to load access data");
    }
  };

  const saveAccess = async (serverId: string, permissions: string[]) => {
    if (!accessUser) return;
    try {
      await sendPostRequest(`/api/admin/users/${accessUser.id}/access`, { serverId, permissions });
      toast.success("Access updated");
      const updated = await sendGetRequest<AccessEntry[]>(`/api/admin/users/${accessUser.id}/access`);
      setAccessEntries(updated);
      setEditingAccess(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to update access");
    }
  };

  const removeAccess = async (serverId: string) => {
    if (!accessUser) return;
    try {
      await sendDeleteRequest(`/api/admin/users/${accessUser.id}/access`, { serverId });
      toast.success("Access removed");
      const updated = await sendGetRequest<AccessEntry[]>(`/api/admin/users/${accessUser.id}/access`);
      setAccessEntries(updated);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to remove access");
    }
  };

  const parseUA = (ua: string | null) => {
    if (!ua) return "Unknown";
    if (ua.length > 60) return ua.slice(0, 60) + "...";
    return ua;
  };

  if (loading) return null;

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/panel"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <h1 className="text-2xl font-semibold">Admin Panel</h1>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1.5">
              <MonitorCog className="w-4 h-4" /> Sessions
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="w-4 h-4" /> Panel Settings
            </TabsTrigger>
          </TabsList>

          {/* ── Users Tab ──────────────────────────────────── */}
          <TabsContent value="users" className="space-y-3 mt-4">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{u.username}</span>
                    <Badge variant="outline" className={ROLE_COLORS[u.role]}>{u.role}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {u._count.sessions} sessions, {u._count.serverAccess} servers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role === "USER" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openAccessEditor(u)}>
                          <KeyRound className="w-3.5 h-3.5 mr-1" /> Permissions
                        </Button>
                        {currentUser?.role === "OWNER" && (
                          <Button variant="outline" size="sm" onClick={() => changeRole(u.id, "ADMIN")}>
                            Promote to Admin
                          </Button>
                        )}
                      </>
                    )}
                    {u.role === "ADMIN" && currentUser?.role === "OWNER" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openAccessEditor(u)}>
                          <KeyRound className="w-3.5 h-3.5 mr-1" /> Permissions
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => changeRole(u.id, "USER")}>
                          Demote to User
                        </Button>
                      </>
                    )}
                    {u.id !== currentUser?.id && u.role !== "OWNER" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => revokeAllSessions(u.id)}>
                          <LogOut className="w-3.5 h-3.5 mr-1" /> Revoke Sessions
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(u)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Panel Settings Tab ─────────────────────────── */}
          <TabsContent value="settings" className="mt-4">
            <PanelSettingsTab />
          </TabsContent>

          {/* ── Sessions Tab ───────────────────────────────── */}
          <TabsContent value="sessions" className="space-y-3 mt-4">
            {sessions.length === 0 && (
              <p className="text-muted-foreground text-sm">No active sessions.</p>
            )}
            {sessions.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.user.username}</span>
                      <Badge variant="outline" className={ROLE_COLORS[s.user.role]}>{s.user.role}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      IP: {s.ip || "unknown"} &middot; {parseUA(s.userAgent)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Created: {new Date(s.createdAt).toLocaleString()} &middot;
                      Expires: {new Date(s.expiresAt).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeSession(s.user.id, s.id)}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" /> Revoke
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Delete User Confirm ─────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete user "${deleteTarget?.username}"?`}
        description="This will revoke all sessions and remove all server access. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        typeToConfirm={deleteTarget?.username}
        onConfirm={() => deleteTarget && deleteUser(deleteTarget.id)}
      />

      {/* ── Permissions Dialog ──────────────────────────── */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Server Access — {accessUser?.username}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {accessEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{entry.server.name}</span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAccess({ serverId: entry.serverId, permissions: [...entry.permissions] })}
                      >
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => removeAccess(entry.serverId)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entry.permissions.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                    {entry.permissions.length === 0 && (
                      <span className="text-xs text-muted-foreground">No permissions</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add server access */}
            {(() => {
              const available = allServers.filter((s) => !accessEntries.some((e) => e.serverId === s.id));
              if (available.length === 0) return null;
              return (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEditingAccess({ serverId: available[0].id, permissions: ["server.view"] });
                    setAddServerOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Server Access
                </Button>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Permission Editor Dialog ────────────────────── */}
      <Dialog open={!!editingAccess} onOpenChange={(open) => !open && setEditingAccess(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
          </DialogHeader>
          {editingAccess && (
            <>
              {addServerOpen && (
                <div className="mb-3">
                  <label className="text-sm font-medium mb-1 block">Server</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={editingAccess.serverId}
                    onChange={(e) => setEditingAccess({ ...editingAccess, serverId: e.target.value })}
                  >
                    {allServers
                      .filter((s) => !accessEntries.some((ae) => ae.serverId === s.id) || s.id === editingAccess.serverId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium">{group.label}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          const allKeys = group.permissions.map((p) => p.key);
                          const allSelected = allKeys.every((k) => editingAccess.permissions.includes(k));
                          if (allSelected) {
                            setEditingAccess({
                              ...editingAccess,
                              permissions: editingAccess.permissions.filter((p) => !allKeys.includes(p)),
                            });
                          } else {
                            setEditingAccess({
                              ...editingAccess,
                              permissions: [...new Set([...editingAccess.permissions, ...allKeys])],
                            });
                          }
                        }}
                      >
                        Toggle all
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {group.permissions.map((perm) => {
                        const checked = editingAccess.permissions.includes(perm.key);
                        return (
                          <div key={perm.key} className="flex items-center justify-between">
                            <span className="text-sm">{perm.label}</span>
                            <Switch
                              checked={checked}
                              onCheckedChange={(val) => {
                                setEditingAccess({
                                  ...editingAccess,
                                  permissions: val
                                    ? [...editingAccess.permissions, perm.key]
                                    : editingAccess.permissions.filter((p) => p !== perm.key),
                                });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setEditingAccess(null); setAddServerOpen(false); }}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  saveAccess(editingAccess.serverId, editingAccess.permissions);
                  setAddServerOpen(false);
                }}>
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
