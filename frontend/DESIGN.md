# OPanel — UI/UX Redesign: Liquid Glass + Modular Panels

## 1. UX Design (User Experience)

### 1.1 User Flows & Pain Points

**Current issues:**
- Dashboard is a fixed 5x3 grid — users can't customize what they see first
- No confirmation dialogs for destructive actions (delete server, remove plugin)
- Server info, charts, console are all crammed on one page with no hierarchy
- Settings/config editing is basic — single Monaco editor, no visual feedback
- No way to rearrange or hide panels — power users want custom layouts

**Target UX principles:**
- **Modular**: Every widget is a panel users can add/remove/resize/rearrange
- **Progressive disclosure**: Show overview first, details on demand (modals/expandable)
- **Confirmation before destruction**: All destructive actions require modal confirmation
- **Keyboard-first**: Ctrl+S everywhere, Escape to close, Tab navigation

### 1.2 Modal Strategy

| Action | Current | Target |
|--------|---------|--------|
| Delete server | `window.confirm()` | `<AlertDialog>` with server name input |
| Delete plugin | Inline button | `<AlertDialog>` with plugin name |
| Delete save/log | Inline button | `<AlertDialog>` |
| Stop server | Inline button | Stay inline (not destructive) |
| Create server | Full page | Keep full page (complex form) |
| Edit MOTD | Inline edit | Keep inline (lightweight) |
| Task create/edit | Already Dialog | Keep as `<Dialog>` |
| Upload plugin | Drag-drop | Keep + add `<Dialog>` for upload progress |
| Whitelist mgmt | Sheet | Keep as `<Sheet>` |

### 1.3 Modular Panel System

**Concept**: Dashboard becomes a **grid of panels** that users can:
- **Drag** to rearrange (drag handle on panel header)
- **Resize** by dragging edges/corners
- **Remove** via X button on panel header
- **Add** via "Add Panel" button that opens a panel picker dialog
- **Reset** layout to default

**Available panels:**
1. Server Info (always visible, not removable)
2. CPU/RAM Chart
3. TPS Chart
4. Players List
5. Console (mini terminal)
6. Uptime
7. System Stats
8. Quick Actions (start/stop/restart)
9. Disk Usage (future)
10. Recent Events (future)

**Layout persistence**: Save to `localStorage` per server.

**Library**: `react-grid-layout` — mature, well-tested, supports breakpoints.

---

## 2. UI Design (Visual Design)

### 2.1 Liquid Glass Design System

**Core visual properties:**
- **Glassmorphism**: Semi-transparent backgrounds with backdrop blur
- **Layered depth**: Cards float above a blurred/gradient background
- **Soft borders**: 1px borders with low-opacity white/black
- **Subtle shadows**: Diffuse, colored shadows (not harsh drop-shadows)
- **Smooth transitions**: 200-300ms ease-out for all interactive states
- **Gradient accents**: Subtle gradients on primary elements

### 2.2 Color Tokens (New)

```css
/* Liquid Glass additions to existing OKLCH theme */
:root {
  /* Glass surfaces */
  --glass: oklch(1 0 0 / 60%);
  --glass-border: oklch(0 0 0 / 8%);
  --glass-shadow: oklch(0 0 0 / 5%);
  --glass-hover: oklch(1 0 0 / 80%);

  /* Backdrop blur */
  --blur-sm: 8px;
  --blur-md: 16px;
  --blur-lg: 24px;

  /* Elevation layers */
  --elevation-1: 0 1px 3px oklch(0 0 0 / 5%), 0 1px 2px oklch(0 0 0 / 3%);
  --elevation-2: 0 4px 12px oklch(0 0 0 / 8%), 0 2px 4px oklch(0 0 0 / 4%);
  --elevation-3: 0 8px 24px oklch(0 0 0 / 12%), 0 4px 8px oklch(0 0 0 / 6%);

  /* Accent gradient */
  --gradient-accent: linear-gradient(135deg, var(--theme), var(--theme-hovered));
}

.dark {
  --glass: oklch(0.2 0 0 / 60%);
  --glass-border: oklch(1 0 0 / 10%);
  --glass-shadow: oklch(0 0 0 / 20%);
  --glass-hover: oklch(0.2 0 0 / 80%);
}
```

### 2.3 Component Styling Changes

**Card → Glass Card:**
- `bg-glass backdrop-blur-md border-glass-border shadow-elevation-1`
- Hover: `bg-glass-hover shadow-elevation-2`
- Active/Selected: `ring-1 ring-theme/30`

**Sidebar:**
- `bg-glass backdrop-blur-lg border-r border-glass-border`
- Active item: `bg-theme/10 text-theme border-l-2 border-theme`

**Navbar:**
- `bg-glass/80 backdrop-blur-md border-b border-glass-border`
- Sticky with blur effect as content scrolls behind

**Buttons:**
- Primary: Solid gradient (`gradient-accent`), white text
- Secondary/Outline: Glass background, border
- Ghost: Transparent, hover reveals glass bg
- Destructive: Keep red, but softer tone

**Dialogs/Modals:**
- Glass overlay: `bg-black/40 backdrop-blur-sm`
- Dialog: `bg-glass backdrop-blur-lg shadow-elevation-3 border border-glass-border`
- Smooth scale-in animation

**Input fields:**
- `bg-glass/50 border border-glass-border focus:ring-1 focus:ring-theme/40`

**Charts:**
- Keep current recharts but with glass card container
- Gradient fills with lower opacity for glass effect

### 2.4 Background

The app background should have a subtle texture/gradient to make glass effect visible:
- Light: Gentle warm gradient (cream → white → light blue)
- Dark: Deep gradient (near-black → very dark blue/purple)
- Optional: Subtle dot pattern or noise texture

### 2.5 Panel System Visual

Each panel in the grid:
- Glass card with rounded corners (`rounded-xl`)
- Drag handle: 6-dot grip icon in header, `cursor-grab`
- Resize handle: Bottom-right corner indicator
- Remove: X button, only visible on hover
- While dragging: `shadow-elevation-3`, slight scale(1.02), border glow

---

## 3. Frontend Implementation

### 3.1 Dependencies to Add

```bash
pnpm add react-grid-layout
pnpm add -D @types/react-grid-layout
```

### 3.2 Implementation Order

#### Phase 1: Design System Foundation
1. Update `globals.css` with new glass tokens
2. Create `components/ui/glass-card.tsx` — reusable glass panel component
3. Update existing shadcn `Card` component to support glass variant
4. Update `Sidebar`, `Navbar` to use glass styles
5. Update `Dialog`, `AlertDialog` for glass overlay & glass body
6. Update `Button` variants for glass style
7. Update `Input`, `Select` for glass style
8. Add background gradient to root layout

#### Phase 2: Alert Dialogs for Destructive Actions
1. Create `components/confirm-dialog.tsx` — reusable confirm dialog
2. Add to: delete server (server list page)
3. Add to: delete plugin (plugins page)
4. Add to: delete save (saves page)
5. Add to: delete log (logs page)
6. Add to: delete task (tasks page)

#### Phase 3: Modular Panel System (Dashboard)
1. Install `react-grid-layout`
2. Create `components/panel-grid.tsx` — grid container with drag/resize
3. Create `components/panel-wrapper.tsx` — individual panel chrome (header, drag handle, remove)
4. Create `hooks/use-panel-layout.ts` — localStorage persistence, default layouts
5. Create `components/panel-picker.tsx` — dialog to add panels
6. Refactor dashboard: extract each section into a standalone panel component:
   - `panels/server-info-panel.tsx`
   - `panels/cpu-ram-panel.tsx`
   - `panels/tps-panel.tsx`
   - `panels/players-panel.tsx`
   - `panels/console-panel.tsx`
   - `panels/uptime-panel.tsx`
   - `panels/system-stats-panel.tsx`
   - `panels/quick-actions-panel.tsx`
7. Wire up the grid with default layout and persistence

#### Phase 4: Polish & Remaining Pages
1. Apply glass styling to all remaining pages (terminal, players, plugins, etc.)
2. Add smooth transitions and animations
3. Responsive breakpoints for panel grid
4. Test dark/light mode thoroughly
5. Performance audit (backdrop-blur can be expensive)

### 3.3 Panel Grid Architecture

```tsx
// hooks/use-panel-layout.ts
interface PanelDefinition {
  id: string;
  title: string;
  icon: LucideIcon;
  component: React.ComponentType<PanelProps>;
  defaultLayout: { x: number; y: number; w: number; h: number };
  minW?: number; minH?: number;
  removable?: boolean; // default true
}

// Store layout per server in localStorage
// Key: `opanel.dashboard-layout.${serverId}`
```

### 3.4 File Structure

```
components/
  panels/
    panel-grid.tsx        — react-grid-layout wrapper
    panel-wrapper.tsx     — individual panel chrome
    panel-picker.tsx      — "add panel" dialog
    server-info-panel.tsx
    cpu-ram-panel.tsx
    tps-panel.tsx
    players-panel.tsx
    console-panel.tsx
    uptime-panel.tsx
    system-stats-panel.tsx
    quick-actions-panel.tsx
  confirm-dialog.tsx      — reusable AlertDialog for destructive actions
hooks/
  use-panel-layout.ts     — layout persistence
```

### 3.5 Responsive Strategy

| Breakpoint | Panel Grid |
|------------|-----------|
| >= 1280px (xl) | 12 columns, full drag/resize |
| 1024-1279px (lg) | 8 columns, drag/resize |
| 768-1023px (md) | 6 columns, drag only |
| < 768px (sm) | Single column stack, no drag |

### 3.6 Performance Considerations

- `backdrop-blur` is GPU-intensive — limit to 3-4 layers max
- Use `will-change: transform` on draggable panels
- Lazy-load Monaco editor
- Debounce layout save to localStorage (300ms)
- Use `React.memo` on panel components to prevent re-renders during drag
