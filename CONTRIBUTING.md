# Contributing to FleetPanel

Thanks for your interest in FleetPanel. This is a hobby fork of
[OPanel](https://github.com/opanel-mc/opanel) maintained by
[@kojikk](https://github.com/kojikk). Bug reports, pull requests and feature
suggestions are welcome.

## Bug reports

Open an issue at
<https://github.com/kojikk/fleetpanel/issues> and include:

- What you were doing
- What you expected to happen
- What actually happened
- Relevant logs (panel + container), Minecraft version, server type
- How to reproduce, if you can

If the bug is in the Java plugin core (`net.opanel.*`), please check whether
it reproduces on upstream
[opanel-mc/opanel](https://github.com/opanel-mc/opanel) first — if it does,
it should be reported upstream, not here.

## Pull requests

1. Fork the repo and create a topic branch from `dev`.
2. Keep changes focused — one feature / fix per PR.
3. Preserve upstream OPanel copyright notices and MPL headers in any file
   inherited from upstream (this is required by MPL-2.0 § 3.4).
4. Add new files under MPL-2.0.
5. Run the frontend lint and tests before submitting:
   ```bash
   cd frontend
   pnpm lint
   pnpm test
   ```
6. If your change touches the Prisma schema, include the migration.
7. Describe what changed and why in the PR body.

## Development setup

See the [Quick start](./README.md#quick-start-docker) section in the README
for running the panel via Docker, and the
[Development](./README.md#development) section for the hot-reload frontend
workflow.

## Scope

FleetPanel intentionally keeps scope small:

- Multi-server Docker orchestration
- Permissions, roles, admin panel
- Historical monitoring, backups, scheduled tasks
- Rebranded UI and i18n maintenance

Changes to the Java plugin core (`plugin/core`, `plugin/spigot-*`,
`plugin/fabric-*`, `plugin/forge-*`, etc.) are generally accepted only when
they are necessary to make the panel work — bigger plugin-side features
should go upstream.

## License

By contributing, you agree that your contributions will be licensed under
the [Mozilla Public License 2.0](./LICENSE), the same as the rest of the
project.
