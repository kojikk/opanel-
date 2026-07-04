# FleetPanel — Technical Audit & Fix Plan (2026-07-04)

Deep audit of the current state of FleetPanel (fork of `opanel-mc/opanel`, local repo `C:\Projects\opanel`, branch `feature/standalone-panel`). Produced by reading the actual frontend/plugin source, the Prisma schema, the existing `OPANEL_FOLLOWUP_PLAN.md`, the code graphs (`code:fleetpanel`, `code:fleetpanel-plugin`), and cross-referencing against the live upstream repo `opanel-mc/opanel` (active, latest release 2.1.3, 2026-07-03).

Goal of this doc: give a complete, evidence-based picture of what's broken/incomplete/legacy, and a concrete, phased plan to fix it — **no scope creep, no new features for their own sake**. A short "worth considering" section at the end lists the few things that look like genuine gaps rather than nice-to-haves.

**How to use the Acceptance Criteria:** every task below has an `AC:` block. After implementing a task, the implementer (Fable 5) must verify each criterion — by running the stated command, test, or manual check — and either mark the task accepted or iterate until it passes. A task is NOT done when the code is written; it's done when its AC pass. Global gate for every phase: `pnpm build` succeeds in `frontend/`, `pnpm vitest run` passes, and (for plugin-touching phases) `./gradlew :core:compileJava` succeeds in `plugin/`.

---

## 1. Current state in one paragraph

The Next.js rewrite (`9050d2ff`) successfully turned OPanel from "a plugin that manages the one server it's embedded in" into "a panel that manages N Minecraft servers as Docker containers," and the core path — create server → Docker container + Prisma row → RCON/monitor/players/plugins/saves/logs/gamerules/settings via `[serverId]` pages — works and is reasonably well-built. But the rewrite left the repo in a transitional state matching almost exactly what `OPANEL_FOLLOWUP_PLAN.md` §3.1 already predicted and never executed: a full parallel set of dead pre-refactor pages/API client/WS layer on the frontend, a full set of dead pre-refactor REST controllers in the Java plugin, one live broken nav link, one completely non-functional feature (task scheduler), a few real reliability gaps in the Docker/RCON orchestration layer, and two auth/exposure issues that matter a lot if this panel is ever reachable beyond localhost.

---

## 2. Findings

### 2.1 Critical — security

- **C1. Open registration, no ownership model.** `frontend/app/api/auth/route.ts` `register` action creates a full-access account for anyone, no invite/first-run gate, no admin approval. There is no `ownerId`/ACL on `Server` (`prisma/schema.prisma`) and no route checks it — every authenticated user can control every server (terminal/RCON, plugin upload, delete). Fine for "only I ever hit this," dangerous the moment the panel is reachable from anywhere else.
- **C2. Java plugin's HTTP API is unauthenticated and network-exposed.** `plugin/core/.../web/WebServer.java` publishes `/api/gamerules`, `/api/info`, `/api/monitor`, `/api/version` on `pluginPort` (bound to the host via `PortBindings` in `frontend/lib/docker/client.ts`) with **no auth filter** and CORS `anyHost()`. Anyone who can reach `<host>:<pluginPort>` can read system info and rewrite gamerules with zero credentials.
- **C3. Plugin (.jar) upload has no validation.** `frontend/app/api/servers/[serverId]/plugins/route.ts` writes any uploaded filename/content straight into `plugins/<name>`, no extension/size check. Any authenticated user (trivial per C1) can drop an arbitrary `.jar` that the JVM will load on restart → RCE inside the game container, which also has the Docker socket mounted (H3) → path to host RCE.

### 2.2 High

- **H1. Hardcoded/weak default secrets.** `docker-compose.yml` ships `JWT_SECRET: change-this-to-a-secure-random-string` and Postgres creds `opanel:opanel`; `frontend/lib/auth.ts` silently falls back to a hardcoded `"opanel-default-secret-change-me"` if unset — no startup check rejects the default, so an unconfigured deploy is silently forgeable.
- **H2. No `middleware.ts`.** Auth is enforced by hand in every route handler (currently consistent, verified route-by-route), but nothing structurally prevents a newly added route from forgetting the check.
- **H3. Docker socket mounted into the panel container.** Documented tradeoff (needed for dockerode), but combined with C1/C3 it means "panel compromised" == "root on host." Worth an explicit decision/doc, not necessarily a code fix.

### 2.3 Medium

- **M1. No rate limiting on login/register** — unlimited password guessing / unlimited account creation.
- **M2/M3. Path-traversal guard in `lib/file-manager/index.ts` uses unanchored `startsWith(dataPath)`** (sibling-directory bypass in theory) and `fileExists()` skips the check other functions have (existence-oracle only). Not currently reachable (server dirs are sanitized), but latent.

### 2.4 High-impact functional bugs / incomplete features

- **F1. Task scheduler is fully non-functional.** `frontend/lib/tasks/scheduler.ts`'s `initScheduler()` is never called anywhere (no `instrumentation.ts`, nothing wires it up), and the Tasks API routes never call `scheduleTask`/`reloadTask`/`cancelTask` either — they only touch Prisma. Users can create/enable/edit cron tasks in the UI and **nothing will ever fire**. This is the single biggest silent gap in the app.
- **F2. Gamerules "don't show up" bug (old backlog item) — root cause found, still present.** `app/api/servers/[serverId]/gamerules/route.ts` GET does 49 **sequential** RCON round-trips (no `Promise.all`), each itself doubled by the RCON pool's health-check-before-send pattern (~98 round trips per page load), with **per-rule failures silently swallowed** (`catch {}` labeled "rule may not exist"). Any transient RCON hiccup mid-loop makes a subset of gamerules vanish from that load — indistinguishable from "unsupported in this version." This matches the historical complaint exactly.
- **F3. No container-level memory/CPU limits (old backlog item "RAM/CPU relationship" — still unresolved).** `frontend/lib/docker/client.ts` `createServerContainer` only sets the `MEMORY` env var (which itzg's image uses purely to compute JVM `-Xmx`), never `HostConfig.Memory`/`NanoCpus`. A server's off-heap usage or a runaway process can starve the host or other containers with nothing to stop it; conversely, no CPU quota means one server can monopolize the host CPU.
- **F4. `createServer` has no rollback/reconciliation across FS + Docker + Postgres.** Directory creation, Docker image pull, container creation, and the Prisma row are four separate steps with no compensating transaction. Concretely: `startContainer()` runs *after* the DB row is committed and returned as success — if it throws, the DB row + container silently persist as "created but broken," and the next create attempt with the same name hits a confusing unique-constraint error. There's also no orphan-container reconciliation anywhere (`listServers()` only ever reads Prisma, never cross-checks `docker ps`).
- **F5. `deleteServer`/`removeContainer` can get permanently stuck if the container is already gone** (e.g. manually removed) — `container.remove({force:true})`'s 404 isn't caught, so `deleteServer` throws before `prisma.server.delete` runs; the phantom DB row becomes undeletable through the UI. (Note: the *original* backlog bug — "container missing → row silently deleted" — is confirmed gone; this is a different, milder failure mode in the same area.)
- **F6. RCON pool has a connection-creation race** (`lib/rcon/client.ts`): concurrent first-requests for the same server (e.g. a dashboard firing `monitor`+`players`+`tasks` at once) can both miss the pool cache and both connect; the second overwrites the first in the `Map`, leaking the first socket.
- **F7. RCON parsers silently fall back to plausible-looking fake data on unrecognized replies.** `parseTps` → hardcoded `20` TPS, `parseMspt` → hardcoded `0` ms, `parsePlayerList` → assumes exact English wording. Any server variant/locale that phrases replies differently reports as "perfectly healthy" instead of surfacing a parse failure — actively misleading monitoring rather than an obvious break.
- **F8. Live broken sidebar link.** `components/app-sidebar.tsx` still links "Code of Conduct" to `/panel/[serverId]/code-of-conduct` for servers ≥1.21.9, but no such route exists under `[serverId]/` (only orphaned pre-refactor pages at `/panel/code-of-conduct` exist, unreachable and pointed at dead plugin endpoints anyway). This is a live 404 in the current UI, not just dead code sitting unused.
- **F9. Plugin WebSocket auth is now self-contradictory.** `BaseEndpoint.init()` still checks a JWT cookie via the plugin's own `JwtManager` — but the only things that ever set that cookie (`AuthController`, `SecurityController`) are dead/unrouted. If anything ever tries to actually use `/socket/terminal|players|inventory` again, the handshake will reject every connection since nothing sets the required cookie anymore.

### 2.5 Legacy / dead code (matches `OPANEL_FOLLOWUP_PLAN.md` §3.1, never executed)

**Frontend** — a full parallel pre-refactor UI still sits in the tree, unreachable from navigation (confirmed: `app-sidebar.tsx` only ever generates `[serverId]`-prefixed links) but not merely inert — every one of these pages calls flat API routes (`/api/info`, `/api/control/*`, `/api/players`, etc.) that **no longer exist**, so if anyone hits a bookmarked/typed URL, the page loads (auth still passes) but every data call silently fails:
- `app/panel/{bukkit-config,code-of-conduct,dashboard,gamerules,logs(+view),players(+inventory),plugins,saves,settings,tasks,terminal}` — ~7,000 lines total.
- `lib/api.ts` (superseded by `lib/api-client.ts`, zero live imports).
- `lib/gamerules/presets.ts` + `presets-old.ts` (only ever imported by the dead old gamerules page).
- `lib/ws/*` (`index.ts`, `terminal.ts`, `players.ts`, `inventory.ts`) + `components/terminal-connector.tsx` — the old plugin-WebSocket transport, superseded by SSE + RCON on the `[serverId]` pages.
- `app/api/servers/[serverId]/ws/route.ts` + `serverApi().wsInfo()` in `lib/api-client.ts` — orphaned, hands out plugin WS connection info nothing calls.
- `components/app-sidebar.tsx`'s dead `.includes("bukkit-config")` conditional (the menu item it guards no longer exists).
- Lost, not just dead: player inventory/NBT viewer (`app/panel/players/inventory/*`) has **no equivalent** under `[serverId]/` — see §5 deep dive; the plugin backend for it is fully working, so "restore" not "rebuild."

**Plugin** — `WebServer.java`'s own doc comment already states the intended headless design (only gamerules/info/monitor/version + 3 WS endpoints), confirming Stage 3.1.1 was *decided* but not *executed*. Currently unrouted/orphaned and safe to delete outright: `AuthController`, `AssetsController`, `BannedIpsController`, `ControlController` (note: its `stopServer`/`reloadServer` would actively conflict with Docker-owned lifecycle if ever re-wired — delete, don't just leave dormant), `DownloadController`, `IconController`, `LogsController`, `PlayersController`, `PluginsController`, `SavesController`, `SecurityController`, `TasksController`, `WhitelistController`, `BeforeController`, plugin's own `ErrorController` (already broken — references a `WebServer.ROOT_PATH` field that no longer exists) and `web/JwtManager` (pending the F9/inventory-auth decision — see §5). Also: `plugin/core/src/main/resources/web/` — a 132MB/270-file legacy static export of the old embedded UI — still physically exists on disk (gitignored, not deleted).

**Upstream comparison note:** the fork's `[serverId]` pages are mostly *independent rewrites*, not verbatim ports of upstream — so upstream's post-fork bugfix commits mostly don't transfer 1:1. What *does* transfer: upstream added a **map viewer**, **MCP server integration**, an **Open API**, and **per-dimension gamerules editing** after the fork point — worth knowing these exist upstream, not because you must copy them, but because "code-of-conduct" and "bukkit-config" pages sitting in the tree are literally unmodified upstream leftovers from before the multi-server refactor, not fork-original work.

---

## 3. Fix plan — phased, fixes-and-cleanup only, with Acceptance Criteria

Conventions for AC below:
- "build passes" = `cd frontend && pnpm build` exits 0 (and `pnpm vitest run` for phases touching tested code).
- "plugin compiles" = `cd plugin && ./gradlew :core:compileJava` exits 0.
- Manual API checks assume the dev stack is up (`docker-compose.dev.yml` postgres + `pnpm dev`); use `curl` against `localhost:3001`.
- Every task also implicitly requires: no regression on the untouched `[serverId]` pages (spot-check dashboard + terminal load for an existing server).

### Phase 0 — Security hotfixes (do first, small diffs, high value)

**0.1. Gate registration (C1).**
Change `register` in `app/api/auth/route.ts` to succeed only when `prisma.user.count() === 0` (first-run bootstrap). Subsequent registrations return 403 with a clear message.
- **AC1:** with an empty `User` table, `POST /api/auth {action:"register"}` creates the account and returns a session (status 200/201).
- **AC2:** with ≥1 existing user, the same request returns 403 and creates no row (`user.count` unchanged).
- **AC3:** login for the existing user still works after the change.
- **AC4:** unit test covering AC1+AC2 added to the Vitest suite and passing.

**0.2. Lock down the plugin HTTP API (C2).**
Preferred minimal fix: stop publishing `pluginPort` to the host — bind it to `127.0.0.1` only in `PortBindings` (`docker/client.ts`), since the only legitimate caller is the panel itself on the same host. Additionally remove `anyHost()` CORS in `WebServer.java` (same-host caller doesn't need CORS at all).
- **AC1:** after creating a server, `docker inspect <container>` shows the plugin port bound to `127.0.0.1:<pluginPort>`, not `0.0.0.0`.
- **AC2:** `curl http://<LAN-IP>:<pluginPort>/api/info` from the host fails to connect; `curl http://127.0.0.1:<pluginPort>/api/info` still succeeds.
- **AC3:** panel's `/api/servers/[id]/monitor` still returns TPS/MSPT sourced from the plugin (`pluginInstalled: true` path), verified by response content.
- **AC4:** plugin compiles; no `anyHost()` remains (`grep -rn "anyHost" plugin/core/src` is empty).
- *Note: existing servers keep old bindings until recreated — document this in the commit message; optionally add a migration note.*

**0.3. Validate plugin upload (C3).**
In `plugins/route.ts` POST: reject non-`.jar` extensions, reject files > 50 MB, sanitize the filename (strip path separators, `..`).
- **AC1:** uploading `test.jar` (any small valid file) succeeds and appears in the server's `plugins/` dir.
- **AC2:** uploading `evil.sh`, `evil.jar.exe`, or a body > 50 MB returns 400 with a descriptive error; nothing is written to disk.
- **AC3:** uploading a file named `..%2F..%2Fescape.jar` (and raw `../escape.jar` in multipart filename) writes nothing outside `plugins/` — verify no file appears above the server data dir.
- **AC4:** unit test for the filename sanitizer added and passing.

**0.4. Enforce a real JWT secret (H1).**
Remove the hardcoded fallback in `lib/auth.ts`; on startup (module load), throw a fatal descriptive error if `JWT_SECRET` is unset, shorter than 32 chars, or equals the known placeholder strings. Update `.env.example` and `docker-compose.yml` with instructions to generate one (`openssl rand -base64 48`).
- **AC1:** starting the app with no `JWT_SECRET` fails fast with a clear error naming the variable (not a silent fallback).
- **AC2:** starting with `JWT_SECRET=change-this-to-a-secure-random-string` also fails fast.
- **AC3:** starting with a generated 48-byte secret works; login round-trip succeeds.
- **AC4:** `grep -rn "opanel-default-secret" frontend/` is empty.

**0.5. Rate-limit auth (M1).**
In-memory sliding-window limiter on `POST /api/auth` login/register actions: e.g. max 5 failed attempts per IP per 10 minutes (in-memory is acceptable — single-instance deploy).
- **AC1:** 5 rapid wrong-password logins → 6th attempt returns 429 even with the correct password.
- **AC2:** after the window expires (mock timers in test, don't sleep 10 min), login succeeds again.
- **AC3:** successful logins do not count toward the limit.
- **AC4:** unit test with fake timers covering AC1–AC3 passing.

**0.6. Fix path-traversal guards (M2/M3).**
In `lib/file-manager/index.ts`: change every guard to `resolved === base || resolved.startsWith(base + path.sep)`; add the same guard to `fileExists()`.
- **AC1:** unit test: for `dataPath=servers/test`, path resolving to `servers/testXYZ/file` is rejected; `servers/test/sub/file` is accepted.
- **AC2:** `fileExists("../../etc/hostname")` (or Windows equivalent) throws/returns the guarded error instead of probing.
- **AC3:** all existing file-manager call sites (settings editor, plugins list, saves, logs) still work — manual spot-check of the `[serverId]/settings` page loading `server.properties`.

### Phase 1 — Delete the dead weight (mechanical, low-risk, matches the plan's own §3.1)

**1.1. Frontend dead-code removal.**
Delete: the 12 pre-refactor `app/panel/*` page directories (`bukkit-config`, `code-of-conduct`, `dashboard`, `gamerules`, `logs`, `players`, `plugins`, `saves`, `settings`, `tasks`, `terminal` — keep `create/`, `page.tsx`, `sub-page.tsx`, layout files used by live pages); `lib/api.ts`; `lib/gamerules/presets.ts` + `presets-old.ts`; `lib/ws/*`; `components/terminal-connector.tsx`; `app/api/servers/[serverId]/ws/route.ts`; `wsInfo()` from `lib/api-client.ts`; the dead `bukkit-config` conditional in `app-sidebar.tsx`.
**Exception:** do NOT delete `app/panel/players/inventory/*`, `components/skin-viewer.tsx`, `app/panel/players/player-sheet.tsx`, or `lib/nbt/*` — they are the raw material for the inventory restore (Phase 3 / §5). Move them to a clearly-marked holding location (e.g. `frontend/_legacy-inventory/`, excluded from the build) or a separate branch instead.
- **AC1:** `pnpm build` passes with zero unresolved-import errors.
- **AC2:** `grep -rn "lib/api\"" frontend/app frontend/components frontend/hooks` (old client) is empty; `grep -rn "lib/ws/" frontend/app frontend/components` is empty.
- **AC3:** manual smoke test: login → server list → each `[serverId]` page (dashboard, terminal, players, plugins, saves, logs, gamerules, tasks, settings) renders without console errors.
- **AC4:** `git diff --stat` shows only deletions/moves + the small sidebar/api-client edits — no behavior changes to live pages.
- **AC5:** the preserved inventory material exists at its holding location and is excluded from the Next.js build.

**1.2. Fix the broken sidebar link (F8).**
Remove the "Code of Conduct" entry from `app-sidebar.tsx` (feature has no backend in the new architecture; decision to rebuild it can be revisited separately).
- **AC1:** for a server with version ≥ 1.21.9, the sidebar renders no "Code of Conduct" item.
- **AC2:** no route in the app links to `code-of-conduct` (`grep -rn "code-of-conduct" frontend/app frontend/components` empty, aside from i18n keys which may be pruned too).

**1.3. Plugin dead-code removal.**
Delete the 15 unrouted classes: `AuthController`, `AssetsController`, `BannedIpsController`, `ControlController`, `DownloadController`, `IconController`, `LogsController`, `PlayersController`, `PluginsController`, `SavesController`, `SecurityController`, `TasksController`, `WhitelistController`, `BeforeController`, `ErrorController`. Keep `GamerulesController`, `InfoController`, `MonitorController`, `VersionController`, the 3 WS endpoints + `BaseEndpoint`/`Connectable`/`Packet`. Keep `JwtManager` for now (needed by the Phase 3 inventory-auth decision; delete it there if that path is declined). Physically delete `plugin/core/src/main/resources/web/`.
- **AC1:** `./gradlew :core:compileJava` passes (this also proves nothing kept referenced anything deleted).
- **AC2:** `./gradlew build` (full multi-module) passes — platform helper modules don't reference deleted classes.
- **AC3:** `plugin/core/src/main/resources/web/` does not exist; repo working tree sheds ~132 MB.
- **AC4:** built JAR dropped into a test server still starts and serves `/api/monitor`, `/api/version`, `/api/info`, `/api/gamerules` (curl each returns 200 with JSON).

### Phase 2 — Reliability fixes in the Docker/RCON/DB core

**2.1. Wire up the task scheduler (F1).**
Create `frontend/instrumentation.ts` with `register()` calling `initScheduler()` (guard with `globalThis.__schedulerInitialized` against dev double-registration; ensure `instrumentationHook` is enabled if the Next version requires it). Make Tasks API routes call `scheduleTask` on create, `reloadTask` on update/toggle, `cancelTask` on delete. Scheduler's cron callback must check the server still exists and is running before sending RCON.
- **AC1:** create a task with cron `* * * * *` (every minute) sending `say scheduled-test` → within 2 minutes, the server console (terminal page or `docker logs`) shows `scheduled-test`. **This is the key end-to-end criterion.**
- **AC2:** disable the task → no further executions over the next 2 minutes; re-enable → executions resume.
- **AC3:** delete the task → no further executions; no error spam in panel logs.
- **AC4:** delete the *server* while a task is enabled → cron tick logs a clean skip (or the job is cancelled), no unhandled rejection.
- **AC5:** restart the panel process → previously-enabled tasks fire again without manual re-save (proves `initScheduler` loads persisted tasks at boot).
- **AC6:** in dev with hot reload, editing an unrelated file does not cause duplicate task firings (guard works) — verify a 1-minute task still fires exactly once per minute.

**2.2. Fix gamerules fetch (F2).**
Parallelize the per-rule RCON calls with a bounded concurrency pool (e.g. 8 at a time — don't flood RCON), add one retry per rule on failure, and distinguish "command error/timeout" (surface as route-level warning or per-rule `error` marker) from "rule unknown in this version" (genuinely omit).
- **AC1:** gamerules page for a running server loads the full rule set; wall-clock time for `GET /api/servers/[id]/gamerules` < 3 s (measure with `curl -w '%{time_total}'`; baseline before fix ~5–15 s).
- **AC2:** repeat the GET 10 times in a loop → identical rule count every time (no flaky disappearing rules).
- **AC3:** with the server stopped, the route returns a clean error (not a 30 s hang, not a partial silently-wrong list).
- **AC4:** setting a gamerule via POST still works and validates the rule name against `KNOWN_GAMERULES` (reject unknown keys with 400).
- **AC5:** unit test for the new fetch helper (mock `executeCommand`) covering: all-succeed, one-fails-then-retry-succeeds, one-fails-twice → marked/omitted correctly.

**2.3. Container resource limits (F3).**
In `createServerContainer`: set `HostConfig.Memory` = JVM heap + 50% overhead (min +1 GiB) derived from the existing `memory` field, `MemorySwap` = same value (no swap), and `NanoCpus` from a new optional `cpus` field (default: unlimited or a sane cap — pick one and document).
- **AC1:** create a server with `memory: "2G"` → `docker inspect` shows `Memory` = 3 GiB (2G heap + max(1G, 50%)) and `MemorySwap` equal to it.
- **AC2:** the container starts and reaches "RCON running" (limit isn't so tight the JVM can't boot).
- **AC3:** if `cpus` is exposed: value round-trips create-form → DB → `docker inspect .HostConfig.NanoCpus`.
- **AC4:** unit test for the heap→container-limit derivation function (covers `512M`, `2G`, `16G` inputs).
- **AC5:** Prisma migration (if a field was added) applies cleanly on the dev DB (`pnpm prisma migrate dev` exits 0).

**2.4. Create-server atomicity + orphan reconciliation (F4).**
Restructure `createServer`: insert the Prisma row first with `status: "creating"`; on any subsequent step failure, run compensation (remove container if created, remove data dir if created, delete the row or mark `status: "failed"` — pick one, document it) and return the real error. Add a reconciliation function (exposed as `GET /api/servers/reconcile` or run inside `listServers`) that flags: DB rows whose `containerId` doesn't exist in Docker, and Docker containers matching the panel's naming convention with no DB row.
- **AC1:** happy path unchanged: create → row exists, container running, UI shows the server.
- **AC2:** simulate container-create failure (e.g. occupy the chosen gamePort with `docker run -p <port>:25565 ...` first) → API returns a descriptive error, and afterwards: no leftover Prisma row in `creating` state (or it's marked `failed` and deletable), no leftover container, and **retrying with the same name succeeds** after freeing the port.
- **AC3:** simulate start failure after create (stop Docker between steps is hard — acceptable to unit-test the compensation logic with mocked docker client instead; test must cover "container created, start throws → compensation removes container and row/marks failed").
- **AC4:** manually `docker rm -f` a server's container, then hit the reconcile path → the mismatch is reported (row flagged, e.g. status `missing`), not silently shown as a normal stopped server, and **not auto-deleted from the DB** (the old backlog bug must not come back).
- **AC5:** create a decoy container named per the panel's convention with no DB row → reconcile reports it as an orphan.

**2.5. Un-stick delete (F5).**
In `removeContainer`, catch 404 (`statusCode === 404`) from both `stop` and `remove` and proceed; `deleteServer` must reach `prisma.server.delete` when the container is already gone.
- **AC1:** create a server, `docker rm -f` its container manually, then delete it in the UI → row disappears, API returns success.
- **AC2:** normal delete of a running server still works (container gone from `docker ps -a`, row gone, data dir per existing behavior).
- **AC3:** non-404 Docker errors still propagate (unit test with mocked docker client throwing 500 → deleteServer rejects, row survives).

**2.6. Fix RCON pool race (F6).**
Replace the plain connection map with a `Map<key, Promise<Rcon>>` (store the in-flight connect promise synchronously before awaiting), so concurrent first-callers share one connection attempt. Clear the entry on connect failure.
- **AC1:** unit test: fire 10 concurrent `sendCommand` calls for the same server with a mocked `Rcon.connect` that counts invocations → exactly 1 connect.
- **AC2:** unit test: connect rejects → entry is cleared, next call retries (2nd connect attempt happens).
- **AC3:** idle-timeout cleanup still works (existing behavior preserved; test that a connection idle past the threshold is closed and evicted).
- **AC4:** manual: dashboard page (which fires several RCON-backed calls at once) works; `docker exec` into the MC container and check RCON connection count isn't growing across repeated page loads.

**2.7. Honest monitoring parsers (F7).**
`parseTps`/`parseMspt`/`parsePlayerList` return `null` (or throw a typed error) on unrecognized input instead of fake defaults; `monitor` route passes `null` through; dashboard renders "—"/"n/a" for null instead of a number.
- **AC1:** existing parser unit tests updated: unrecognized input → `null`, all previously-passing recognized formats still parse correctly.
- **AC2:** dashboard for a vanilla server (no `tps` command) shows "—" (or equivalent), not a green "20 TPS".
- **AC3:** dashboard for a Paper server with the plugin installed still shows real TPS numbers.
- **AC4:** no chart/graph component crashes on null datapoints (spot-check the CPU/RAM/TPS graphs render).

### Phase 3 — Restore the inventory viewer + settle plugin WS auth (the one "feature" item, justified in §5)

This is a restore of an existing, working plugin capability, not a net-new feature. It also forces the F9 decision, so they're bundled.

**3.1. Decide and implement plugin↔panel WS auth (F9).**
Recommended design: panel-issued short-lived token. Add to `WebServer.java` a shared-secret check: plugin reads an `OPANEL_WS_SECRET` (or reuses per-server `accessKey`) from its config; the panel gets a new route `GET /api/servers/[serverId]/plugin-token` (behind `requireAuth`) that mints a short-lived (e.g. 5 min) token the plugin's `BaseEndpoint` verifies. Replace the dead `JwtManager` cookie check in `BaseEndpoint.init()` with verification of this token (query param or `Sec-WebSocket-Protocol` — cookie won't cross ports cleanly). Delete `JwtManager` if unused after this, or repurpose it.
- **AC1:** WS connect with a fresh panel-minted token succeeds (`connect` packet received).
- **AC2:** WS connect with no token / garbage token / expired token is rejected with close code 1008.
- **AC3:** the token route itself requires panel auth (curl without session cookie → 401).
- **AC4:** plugin compiles; full `./gradlew build` passes.
- **AC5:** the secret is per-server or per-install, not a hardcoded constant in the repo (`grep` for it finds only config plumbing).

**3.2. Restore the inventory viewer under `[serverId]`.**
Move the preserved components (`inventory-content/item/dialog/explorer`, `skin-viewer`, `player-sheet`, `lib/nbt/*`) to `app/panel/[serverId]/players/`, adapt to `serverApi(serverId)` conventions, and point the WS client at the per-server plugin address (`ws://<panel-host-mapped>:${server.pluginPort}` — note 0.2 bound the port to 127.0.0.1, so the browser can't reach it directly; proxy the WS through the panel (Next.js route handler or a tiny WS proxy) or bind plugin port to localhost + panel-side proxy — the proxy approach is required for this to work at all remotely, choose it).
- **AC1:** on the `[serverId]/players` page, clicking an online player opens the detail sheet with the 3D skin render.
- **AC2:** the inventory grid shows the player's actual current items (verify against in-game F3 knowledge / creative-give a known item and see it appear).
- **AC3:** live sync: move an item in-game → the panel grid updates without refresh within a few seconds.
- **AC4:** edit path: set an item via the panel dialog → it appears in the player's in-game inventory.
- **AC5:** offline behavior: for a server where the plugin isn't installed (`pluginInstalled: false`), the inventory UI is hidden or shows a clear "requires plugin" notice — no spinner-forever, no console errors.
- **AC6:** `pnpm build` passes; no imports from `_legacy-inventory` holding location remain (the holding dir is deleted).

### Phase 4 (optional, decide at the end) — remaining judgment calls
- If after Phase 3 the terminal/players WS endpoints (`TerminalEndpoint`, `PlayersEndpoint`) still have no consumer (SSE+RCON covers terminal; players page polls), delete them and their frontend remnants, leaving `InventoryEndpoint` as the only WS.
  - **AC:** plugin builds; inventory WS still works (AC of 3.2 re-run); `grep -rn "socket/terminal\|socket/players"` across both codebases is empty.
- Server ownership (`Server.ownerId`) — only if the panel will ever have >1 real user. Minimal: owner sees own servers, first user (admin) sees all.
  - **AC:** second user registers (temporarily lift 0.1's gate in a test), creates a server, cannot see/control the first user's servers via UI or direct API calls (403 on foreign serverId); admin sees all.

---

## 4. What's actually missing (confirmed gaps, not "add for the sake of adding")

Everything below was cross-checked against upstream and/or the running code — these are the only items that look like genuine holes rather than scope creep:

- **Multi-user roles/ownership** — confirmed missing upstream too (not a regression), but doubles as a security requirement if the panel ever gets a second user. Covered as optional Phase 4.
- **Container resource limits** — covered in Phase 2.3; not a new feature, it's closing a gap the tool already implies it has (there's a `memory` field in the create-server form; it's just not enforced at the container level).
- **Orphan/reconciliation check** (Docker vs Prisma) — covered in Phase 2.4.
- Backups, historical monitoring, server templates — already on your own backlog (`OPANEL_FOLLOWUP_PLAN.md` §3.2) and upstream doesn't have them either; **not** re-recommended here since the focus is fixing what exists — mentioned only so this doc doesn't look like it forgot them.

---

## 5. Deep dive: player inventory viewer (gameplay-data feature) — plugin ↔ panel wiring

Traced the full chain end to end, since gameplay features run through the plugin integration:

**The plugin side is real, working, non-trivial code — not a stub.** `plugin/core/.../common/OPanelInventory.java` defines a clean interface (`getItems`/`setItem`/`getHash`/`serialize` → slot/id/count/SNBT + a content hash for diffing), and it's genuinely implemented per platform: `bukkit-helper/BaseBukkitInventory.java` (+`...OfflineInventory.java`), `fabric-helper/BaseFabricInventory.java`, `forge-helper/BaseForgeInventory.java` (each with an "offline" variant for reading a player's inventory from their save file when they're not connected). `endpoint/InventoryEndpoint.java` (WebSocket, `/socket/inventory/{uuid}`) sends the current inventory on connect, accepts `update` packets to actually **write** an item back into a live player's inventory (drag-and-drop editing, not just viewing), and pushes live `update` packets whenever `EventManager` fires `PLAYER_INVENTORY_CHANGE` — i.e. real-time sync while you're editing, not a polling hack. This is legitimately one of the more sophisticated parts of the whole plugin.

**The panel side is where it's completely broken, in three independent, stacked ways:**

1. **UI unreachable.** The only UI for it — `frontend/app/panel/players/inventory/*` (page, `inventory-content.tsx`, `inventory-item.tsx`, `item-dialog.tsx`, `item-explorer.tsx`) plus the 3D skin viewer (`components/skin-viewer.tsx`, used from `app/panel/players/player-sheet.tsx`) and the entire `frontend/lib/nbt/*` module (NBT parsing, SNBT formatting, enchantment/potion-color resolvers) — lives **only** under the old pre-refactor `app/panel/players/` tree, not under `[serverId]/players/`. No click path to it exists in the current UI. (The current `[serverId]/players/page.tsx` is a bare online/banned list with kick/op/ban buttons and static `mineatar.io` face thumbnails — no per-player detail view, no inventory, no 3D skin render.)
2. **Even the dead page's WS client talks to the wrong thing.** `lib/ws/inventory.ts` connects via the shared `lib/ws/index.ts` base client, which takes `wsUrl` from the **legacy** `lib/api.ts` (hardcoded to the old single-embedded-plugin assumption) — never updated for the multi-server `pluginPort` model.
3. **The WS auth handshake is structurally unsatisfiable today.** `endpoint/BaseEndpoint.java:42-47` requires a `token` cookie verified via `JwtManager.verifyToken(...)`. The **only** code that ever mints that cookie is the plugin's own `AuthController` (CRAM login flow) — which is not registered in `WebServer.java`'s routes at all. So there is currently **no code path in the entire repo, plugin or panel, that can produce a valid token** — even with points 1–2 fixed, every connection would be rejected `1008 Unauthorized`. Not a config oversight; a fully dead-ended handshake.

**Net assessment:** this is not "a legacy feature that got cleaned up" and not "a feature that needs building from scratch" — it's a **fully-implemented, real-time, bidirectional inventory editor sitting on solid per-platform Java code, disconnected from the current panel by exactly three fixable breaks.** Phase 3 restores it: move the preserved UI under `[serverId]`, fix the WS addressing (via a panel-side WS proxy, which also keeps the plugin port private per Phase 0.2), and give the handshake a real token source minted by the panel after its own auth. This is the clearest example in the whole audit of "something genuinely valuable already built" — prioritized ahead of anything net-new.

---

## 6. Suggested execution order for Fable 5

Phase 0 (security) → Phase 1 (delete dead code — makes the rest of the codebase much easier to reason about) → Phase 2 (reliability fixes) → Phase 3 (inventory restore + WS auth) → Phase 4 (optional). Each phase is independently shippable/testable; each task ends with its AC checked and either accepted or iterated. Phase 1 in particular is almost pure deletion and very low-risk to do in one pass per side (frontend vs plugin) — but remember the 1.1 exception: the inventory material is quarantined, not deleted, because Phase 3 needs it.
