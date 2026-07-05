# FleetPanel

[![LICENSE](https://img.shields.io/badge/license-MPL_2.0-blue.svg "LICENSE")](./LICENSE)

> A standalone multi-server Minecraft orchestration panel

FleetPanel is a web panel for running and managing a fleet of Minecraft servers in Docker. It provisions server containers, manages their lifecycle (create, start, stop, delete, reconcile), and gives administrators a dashboard, player management, gamerule editing, plugin management, a live terminal, log viewing, and scheduled tasks — all from the browser.

FleetPanel is a fork of [OPanel](https://github.com/opanel-mc/opanel), rewritten as a standalone multi-server Docker orchestration panel. The original OPanel runs as a server-side plugin bundled with a panel for a single server; FleetPanel inverts that model — the panel orchestrates many Docker-hosted servers and installs a companion plugin into each.

### Features

- Multi-server orchestration: create, start, stop, and delete Dockerized Minecraft servers from one panel
- Dashboard providing a comprehensive overview of each server
- Saves manager for uploading, downloading, deleting or enabling world saves
- Players manager for players, bans and whitelist, with kick / ban / permission actions
- Gamerules editor — toggle gamerules without entering commands
- Plugin manager to enable / disable plugins or mods and view plugin details
- Server terminal to send messages or execute commands from the web panel
- Server logs manager and viewer
- Scheduled tasks (cron)

## Attribution / NOTICE

FleetPanel is a derivative work of **OPanel** by Norcleeh (NriotHrreion) and the OPanel contributors:
<https://github.com/opanel-mc/opanel>

OPanel is licensed under the [Mozilla Public License 2.0](./LICENSE). This fork remains under MPL-2.0; files originating from OPanel retain their original license terms, and the original license text is preserved verbatim in [LICENSE](./LICENSE).

## License

[MPL-2.0](./LICENSE)
