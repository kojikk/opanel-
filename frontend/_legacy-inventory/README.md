# Legacy inventory quarantine (Phase 3 raw material)

This directory holds the OLD pre-refactor player/inventory UI, quarantined during the
Phase 1 dead-code cleanup. It is NOT part of the build:

- It lives outside `app/`, so Next.js does not route it.
- It is listed in `tsconfig.json` `"exclude"`, so it is not type-checked.

Contents:

- `app/panel/players/inventory/` — the old inventory editor pages/components
  (page.tsx, inventory-content.tsx, inventory-item.tsx, item-dialog.tsx, item-explorer.tsx)
- `app/panel/players/player-sheet.tsx` — old player detail sheet (uses SkinViewer)
- `app/panel/players/player-utils.ts` — helpers the above import (kick/ban/op actions;
  depends on the deleted `lib/api.ts` client — must be ported)
- `components/skin-viewer.tsx` — minecraft-skin-viewer wrapper (only the old player sheet used it)
- `ws/index.ts`, `ws/inventory.ts` — the old plugin-WebSocket client layer
  (reference for the Phase 3 inventory transport rewrite; the rest of `lib/ws/` was deleted)
- `hooks/use-websocket.ts` — React hook wrapping the old WebSocketClient

Still LIVE in the main tree (the quarantined code imports them from their original paths):
`lib/nbt/`, `lib/texture.ts`, `lib/emitter.ts`, `contexts/inventory-context.ts`,
`contexts/api-context.ts`, `components/i18n-text.tsx`, `components/online-badge.tsx`,
`components/prompt.tsx`, UI kit under `components/ui/`.

Purpose: Phase 3 will rewrite the inventory feature for the multi-server
`app/panel/[serverId]/` layout using this as reference. Delete this directory once
Phase 3 lands.
