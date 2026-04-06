/**
 * Granular per-server permissions.
 *
 * Format: "resource.action"
 * OWNER and ADMIN bypass all permission checks.
 * USER requires explicit ServerAccess with matching permissions.
 */

// ── Permission constants ────────────────────────────────────────────

export const P = {
  // Server lifecycle
  SERVER_VIEW:           "server.view",
  SERVER_START:          "server.start",
  SERVER_STOP:           "server.stop",
  SERVER_DELETE:         "server.delete",
  SERVER_CREATE:         "server.create",

  // Console
  CONSOLE_VIEW:          "console.view",
  CONSOLE_EXECUTE:       "console.execute",

  // Players
  PLAYERS_VIEW:          "players.view",
  PLAYERS_KICK:          "players.kick",
  PLAYERS_BAN:           "players.ban",
  PLAYERS_OP:            "players.op",
  PLAYERS_GAMEMODE:      "players.gamemode",
  PLAYERS_INVENTORY:     "players.inventory",

  // Whitelist
  WHITELIST_VIEW:        "whitelist.view",
  WHITELIST_MANAGE:      "whitelist.manage",

  // Plugins
  PLUGINS_VIEW:          "plugins.view",
  PLUGINS_UPLOAD:        "plugins.upload",
  PLUGINS_TOGGLE:        "plugins.toggle",
  PLUGINS_DELETE:        "plugins.delete",

  // Saves / Worlds
  SAVES_VIEW:            "saves.view",
  SAVES_DELETE:          "saves.delete",

  // Logs
  LOGS_VIEW:             "logs.view",
  LOGS_DELETE:            "logs.delete",

  // Tasks (cron)
  TASKS_VIEW:            "tasks.view",
  TASKS_MANAGE:          "tasks.manage",

  // Gamerules
  GAMERULES_VIEW:        "gamerules.view",
  GAMERULES_EDIT:        "gamerules.edit",

  // Settings / Config files
  SETTINGS_VIEW:         "settings.view",
  SETTINGS_EDIT:         "settings.edit",

  // Icon / MOTD
  ICON_VIEW:             "icon.view",
  ICON_EDIT:             "icon.edit",

  // Monitoring
  MONITOR_VIEW:          "monitor.view",
} as const;

export type Permission = (typeof P)[keyof typeof P];

/** All permission values as a flat array */
export const ALL_PERMISSIONS: Permission[] = Object.values(P);

/** Human-readable labels grouped by category for the admin UI */
export const PERMISSION_GROUPS: { label: string; permissions: { key: Permission; label: string }[] }[] = [
  {
    label: "Server",
    permissions: [
      { key: P.SERVER_VIEW, label: "View server" },
      { key: P.SERVER_START, label: "Start / Stop / Restart" },
      { key: P.SERVER_STOP, label: "Stop server" },
      { key: P.SERVER_DELETE, label: "Delete server" },
      { key: P.SERVER_CREATE, label: "Create servers" },
    ],
  },
  {
    label: "Console",
    permissions: [
      { key: P.CONSOLE_VIEW, label: "View console output" },
      { key: P.CONSOLE_EXECUTE, label: "Execute commands" },
    ],
  },
  {
    label: "Players",
    permissions: [
      { key: P.PLAYERS_VIEW, label: "View player list" },
      { key: P.PLAYERS_KICK, label: "Kick players" },
      { key: P.PLAYERS_BAN, label: "Ban / Pardon players" },
      { key: P.PLAYERS_GAMEMODE, label: "Change gamemode" },
      { key: P.PLAYERS_OP, label: "Op / Deop players" },
      { key: P.PLAYERS_INVENTORY, label: "View / Edit inventory" },
    ],
  },
  {
    label: "Whitelist",
    permissions: [
      { key: P.WHITELIST_VIEW, label: "View whitelist" },
      { key: P.WHITELIST_MANAGE, label: "Manage whitelist" },
    ],
  },
  {
    label: "Plugins",
    permissions: [
      { key: P.PLUGINS_VIEW, label: "View plugins" },
      { key: P.PLUGINS_UPLOAD, label: "Upload plugins" },
      { key: P.PLUGINS_TOGGLE, label: "Enable / Disable plugins" },
      { key: P.PLUGINS_DELETE, label: "Delete plugins" },
    ],
  },
  {
    label: "Saves",
    permissions: [
      { key: P.SAVES_VIEW, label: "View worlds" },
      { key: P.SAVES_DELETE, label: "Delete worlds" },
    ],
  },
  {
    label: "Logs",
    permissions: [
      { key: P.LOGS_VIEW, label: "View logs" },
      { key: P.LOGS_DELETE, label: "Delete logs" },
    ],
  },
  {
    label: "Tasks",
    permissions: [
      { key: P.TASKS_VIEW, label: "View scheduled tasks" },
      { key: P.TASKS_MANAGE, label: "Create / Edit / Delete tasks" },
    ],
  },
  {
    label: "Gamerules",
    permissions: [
      { key: P.GAMERULES_VIEW, label: "View gamerules" },
      { key: P.GAMERULES_EDIT, label: "Edit gamerules" },
    ],
  },
  {
    label: "Settings",
    permissions: [
      { key: P.SETTINGS_VIEW, label: "View config files" },
      { key: P.SETTINGS_EDIT, label: "Edit config files" },
    ],
  },
  {
    label: "Icon & MOTD",
    permissions: [
      { key: P.ICON_VIEW, label: "View icon / MOTD" },
      { key: P.ICON_EDIT, label: "Change icon / MOTD" },
    ],
  },
  {
    label: "Monitoring",
    permissions: [
      { key: P.MONITOR_VIEW, label: "View CPU / RAM / TPS" },
    ],
  },
];
