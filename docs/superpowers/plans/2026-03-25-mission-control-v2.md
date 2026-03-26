# Mission Control V2 — NASA/SpaceX Telemetry Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/mission-control` page as a dense, 10-panel NASA/SpaceX-style telemetry display with deep navy + cyan palette, ring gauges, commit heatmaps, per-repo tables, and interactive charts.

**Architecture:** Complete rewrite of MissionControl.tsx into a 4-column grid of 10 independent panel components. Existing data hooks (useMissionControlData, useEngMetrics, useHealthMetrics) are preserved and extended. Each panel is its own file in `src/components/mission-control/`. Design tokens rewritten for navy + cyan palette.

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion, pure SVG (gauges, sparklines, heatmap), regression-js

**Design spec:** `~/.claude/plans/serene-bubbling-trinket.md`

---

## File Structure

```
REWRITE:
  src/styles/mission-control-tokens.ts          ← navy + cyan palette
  src/pages/MissionControl.tsx                   ← new 10-panel grid layout + data hooks

CREATE:
  src/components/mission-control/PanelHeader.tsx  ← shared: title + status dot + optional count
  src/components/mission-control/MissionTimer.tsx ← full-width status bar: clock, T+, sync
  src/components/mission-control/EngineeringSummary.tsx ← hero commit count, PRs, LoC, trends
  src/components/mission-control/CommitHeatmap.tsx ← 30-day grid, hover tooltips
  src/components/mission-control/RepoStatusTable.tsx ← per-repo table with activity dots
  src/components/mission-control/RecoveryGauge.tsx ← SVG ring gauge + mini vitals
  src/components/mission-control/LocTelemetry.tsx ← dual-line sparkline (added/deleted)
  src/components/mission-control/PrPipeline.tsx   ← PRs created/merged/rate
  src/components/mission-control/VitalsReadout.tsx ← dense telemetry rows: HRV, RHR, strain, cal
  src/components/mission-control/SleepAnalysis.tsx ← duration bar, efficiency, sparkline
  src/components/mission-control/TrajectoryBar.tsx ← full-width predictions footer
  src/components/mission-control/Sparkline.tsx    ← extracted interactive sparkline (from current MC)
```

---

## Task 1: Design Tokens Rewrite

**Files:**

- Rewrite: `src/styles/mission-control-tokens.ts`

- [ ] **Step 1: Rewrite tokens with SpaceX navy + cyan palette**

Replace the entire file. New palette:

- Backgrounds: `#0a1628` (page), `#0d1f3c` (panel), `#132d5e` (elevated)
- Borders: `#1a3a6e`
- Accent: `#00d4ff` (cyan primary), `#00a3cc` (teal secondary)
- Status: `#00ff88` (green/GO), `#ffb800` (amber/warning), `#ff3366` (red/alert)
- Text: `#c8d6e5` (primary), `#5a7a9e` (secondary/labels)
- Font: JetBrains Mono (keep)
- Hero: 48px weight 300 (smaller for dense layout)
- Metric: 20px weight 300
- Label: 9px uppercase letter-spacing 2px
- Add `panel` style object: background, border, borderRadius 4px, padding

- [ ] **Step 2: Lint**

```bash
bun run lint:file -- src/styles/mission-control-tokens.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/mission-control-tokens.ts
git commit -m "feat(mc-v2): rewrite design tokens with navy + cyan SpaceX palette"
```

---

## Task 2: Shared Components (PanelHeader + Sparkline)

**Files:**

- Create: `src/components/mission-control/PanelHeader.tsx`
- Create: `src/components/mission-control/Sparkline.tsx`

- [ ] **Step 1: Create PanelHeader**

Shared panel header used by every panel. Props:

- `title: string` — panel name (uppercase)
- `status?: 'nominal' | 'warning' | 'error' | 'inactive'` — colored dot
- `detail?: string` — right-aligned detail text (e.g., "19 TRACKED")

Renders: horizontal flex with title (teal color), optional status dot (green/amber/red/gray), optional right-aligned detail. 1px bottom border in `#1a3a6e`. Padding from tokens.

- [ ] **Step 2: Extract Sparkline from current MissionControl.tsx**

Extract the existing interactive Sparkline component (lines 173-305 of current file). Keep it exactly as-is but:

- Accept new optional props: `lineColor?: string`, `gridColor?: string` for the dual-line sparkline use case
- Default lineColor to `mcTokens.colors.accent.cyan`
- Default gridColor to `mcTokens.colors.border.default`
- Export as named export

- [ ] **Step 3: Lint both files**

```bash
bun run lint:file -- src/components/mission-control/PanelHeader.tsx src/components/mission-control/Sparkline.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mission-control/
git commit -m "feat(mc-v2): add PanelHeader and extract Sparkline component"
```

---

## Task 3: Mission Timer Bar

**Files:**

- Create: `src/components/mission-control/MissionTimer.tsx`

- [ ] **Step 1: Create MissionTimer component**

Full-width top bar. Props:

- `lastSync: string | null`
- `syncErrors: boolean`
- `lastCommitDate: string | null` (for T+ countdown)

Renders 4 sections in a flex row:

1. **Left:** "NOCTISIUM" in cyan, bold
2. **Center-left:** Sync status — pulsing green dot + "SYNCED Xm AGO" (or "SYNC ERROR" in red, or "STALE" in amber)
3. **Center-right:** "T+ HH:MM:SS" countdown since last commit — ticks every second via useEffect/setInterval. If no commit data, show "T+ --:--:--"
4. **Right:** Live clock "MM/DD/YYYY HH:MM:SS" ticking every second

Background: `#081428` (darker than panels). 1px cyan bottom border. JetBrains Mono 10px uppercase.

- [ ] **Step 2: Lint**

```bash
bun run lint:file -- src/components/mission-control/MissionTimer.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mission-control/MissionTimer.tsx
git commit -m "feat(mc-v2): add MissionTimer bar with T+ countdown and live clock"
```

---

## Task 4: Engineering Summary Panel

**Files:**

- Create: `src/components/mission-control/EngineeringSummary.tsx`

- [ ] **Step 1: Create EngineeringSummary component**

Props: `eng` metrics object from `useEngMetrics` (todayCommits, weekCommits, monthCommits, weekTrend, totalPRsCreated, totalPRsMerged, shipDays, totalDaysThisMonth, monthLinesAdded, monthLinesDeleted).

Layout:

- PanelHeader: "ENGINEERING OUTPUT" with green status dot
- Hero number: `monthCommits` in large cyan text
- Label: "commits this month"
- Compact metric grid (2 columns):
  - This Week: value + trend %
  - Ship Days: X/Y (Z%)
  - PRs Created: value
  - PRs Merged: value (rate%)
- LoC row: "+128,848" in green, "-32,315" in red, separated by " / "

All text uses mcTokens. No sparkline here (that's in LocTelemetry).

- [ ] **Step 2: Lint and commit**

```bash
bun run lint:file -- src/components/mission-control/EngineeringSummary.tsx
git add src/components/mission-control/EngineeringSummary.tsx
git commit -m "feat(mc-v2): add EngineeringSummary panel with compact metric grid"
```

---

## Task 5: Commit Heatmap Panel

**Files:**

- Create: `src/components/mission-control/CommitHeatmap.tsx`

- [ ] **Step 1: Create CommitHeatmap component**

Props: `commits: CommitRow[]` (raw commit data, last 90 days)

Renders a 30-day horizontal heatmap:

- CSS grid: 7 rows (Mon-Sun) x ~5 columns (weeks)
- Each cell is a small square (div) with background color based on commit count
- Color scale using mcTokens: `bg.panel` (0 commits) → `#00a3cc` (1-3) → `#00d4ff` (4-10) → `#c8d6e5` (10+)
- Day labels on left (M, W, F)
- Hover: useState for hovered cell index, show tooltip with "Mar 22: 30 commits"
- Aggregate commits across repos per date before rendering

- [ ] **Step 2: Lint and commit**

```bash
bun run lint:file -- src/components/mission-control/CommitHeatmap.tsx
git add src/components/mission-control/CommitHeatmap.tsx
git commit -m "feat(mc-v2): add CommitHeatmap panel with interactive hover"
```

---

## Task 6: Repo Status Table

**Files:**

- Create: `src/components/mission-control/RepoStatusTable.tsx`

- [ ] **Step 1: Create RepoStatusTable component**

Props: `commits: CommitRow[]`, `repoCount: number`

Renders:

- PanelHeader: "REPO STATUS" with detail "19 TRACKED"
- Scrollable table (max-height with overflow-y auto)
- Columns: Repo (short name) | Today | Month | LoC | Status dot
- Aggregate per repo: sum commits today, sum commits this month, sum LoC added - deleted
- Status dot: green `#00ff88` (committed today), amber `#ffb800` (committed this week), gray `#5a7a9e` (inactive)
- Sort: repos with today's activity first, then this month, then inactive
- Repo name: strip owner prefix (show "platform" not "tombridger1030/platform")
- Monospace alignment, compact 24px row height
- LoC formatted with +/- prefix and K/M abbreviation

- [ ] **Step 2: Lint and commit**

```bash
bun run lint:file -- src/components/mission-control/RepoStatusTable.tsx
git add src/components/mission-control/RepoStatusTable.tsx
git commit -m "feat(mc-v2): add RepoStatusTable with activity dots and LoC"
```

---

## Task 7: Recovery Ring Gauge

**Files:**

- Create: `src/components/mission-control/RecoveryGauge.tsx`

- [ ] **Step 1: Create RecoveryGauge component**

Props: `recovery: number | null`, `hrv: number | null`, `strain: number | null`, `sleepHours: number | null`, `whoopConnected: boolean`

Pure SVG ring gauge:

- Circle with `stroke-dasharray` and `stroke-dashoffset` to show fill %
- Track circle: `#1a3a6e` (navy border color)
- Fill circle: color based on recovery level — green (67-100%), amber (34-66%), red (0-33%)
- Center text: recovery % in large font, "RECOVERY" label below
- Below the gauge: 3 mini stats in a row — "HRV 48ms" | "STRAIN 14.2" | "SLEEP 7.2h"
- If not connected: show dashed ring with "CONNECT WHOOP" text
- SVG viewBox="0 0 200 200", circle cx=100 cy=100 r=80

Implementation:

```
circumference = 2 * Math.PI * 80 = ~502
dashoffset = circumference * (1 - recovery/100)
```

- [ ] **Step 2: Lint and commit**

```bash
bun run lint:file -- src/components/mission-control/RecoveryGauge.tsx
git add src/components/mission-control/RecoveryGauge.tsx
git commit -m "feat(mc-v2): add RecoveryGauge SVG ring with mini vitals"
```

---

## Task 8: LoC Telemetry + PR Pipeline + Vitals + Sleep

**Files:**

- Create: `src/components/mission-control/LocTelemetry.tsx`
- Create: `src/components/mission-control/PrPipeline.tsx`
- Create: `src/components/mission-control/VitalsReadout.tsx`
- Create: `src/components/mission-control/SleepAnalysis.tsx`

- [ ] **Step 1: Create LocTelemetry**

Dual-line sparkline panel. Props: `commits: CommitRow[]`

- Compute 30-day daily LoC added and deleted arrays
- Render two Sparkline polylines on same SVG — green for added, red for deleted
- Interactive hover shows both values: "Mar 22: +1,234 / -567"
- Summary text below: net LoC for the month

- [ ] **Step 2: Create PrPipeline**

Props: `totalPRsCreated: number`, `totalPRsMerged: number`

- PanelHeader: "PR PIPELINE"
- Rows: Created, Merged, Merge Rate (%)
- Visual: horizontal bar showing merged/created ratio (cyan fill on navy track)

- [ ] **Step 3: Create VitalsReadout**

Props from health metrics: `hrv, restingHR, strain, calories, hrvTrend, hrTrend`

- PanelHeader: "VITALS READOUT"
- Dense grid: 4 rows, each with label | value | unit | trend arrow
- HRV: higher is better (green up arrow)
- RHR: lower is better (green down arrow)
- Strain/Calories: neutral display
- Monospace aligned values, telemetry-style

- [ ] **Step 4: Create SleepAnalysis**

Props: `sleepHours, sleepEfficiency, spark (30-day sleep array), sparkLabels`

- PanelHeader: "SLEEP ANALYSIS"
- Horizontal bar: filled portion = sleepHours/8 (8h target), cyan fill on navy track
- Text: "7.2h" large, "85% efficiency" below
- Mini sparkline of 30-day sleep hours (reuse Sparkline component)
- "30-day avg: X.Xh" label

- [ ] **Step 5: Lint all four**

```bash
bun run lint:file -- src/components/mission-control/LocTelemetry.tsx src/components/mission-control/PrPipeline.tsx src/components/mission-control/VitalsReadout.tsx src/components/mission-control/SleepAnalysis.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/mission-control/
git commit -m "feat(mc-v2): add LoC telemetry, PR pipeline, vitals readout, sleep analysis panels"
```

---

## Task 9: Trajectory Bar

**Files:**

- Create: `src/components/mission-control/TrajectoryBar.tsx`

- [ ] **Step 1: Create TrajectoryBar**

Props: `engPrediction: Prediction | null`, `healthPrediction: Prediction | null`

- Full-width bottom bar
- Two sections separated by a vertical divider:
  - Left: Engineering prediction text (or "Collecting data...")
  - Right: Health prediction text (or "Connect Whoop for predictions")
- Smaller text (`body` size), teal color for labels, primary for values
- Subtle top border

- [ ] **Step 2: Lint and commit**

```bash
bun run lint:file -- src/components/mission-control/TrajectoryBar.tsx
git add src/components/mission-control/TrajectoryBar.tsx
git commit -m "feat(mc-v2): add TrajectoryBar predictions footer"
```

---

## Task 10: Page Layout Rewrite

**Files:**

- Rewrite: `src/pages/MissionControl.tsx`

- [ ] **Step 1: Rewrite MissionControl.tsx**

This is the main assembly task. The page component:

1. Keeps the existing data hooks (`useMissionControlData`) and derived metrics hooks (`useEngMetrics`, `useHealthMetrics`) — move them to the top of the file or keep inline
2. Imports all 10 panel components
3. Renders a 4-column CSS grid layout:

```
Row 0: MissionTimer (col-span-4)
Row 1: EngineeringSummary | CommitHeatmap | RepoStatusTable | RecoveryGauge
Row 2: LocTelemetry | PrPipeline | VitalsReadout | SleepAnalysis
Row 3: TrajectoryBar (col-span-4)
```

- Page background: `mcTokens.colors.bg.primary` (#0a1628)
- Grid gap: 1px (borders create the panel dividers)
- Each panel gets the `mcTokens.panel` style (bg, border, padding)
- Framer Motion staggered fade-in on panels
- Responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Loading state: "LOADING TELEMETRY..." centered on navy background
- Empty state: prompt to connect GitHub/Whoop
- Selection override: `.mc-root ::selection { background: #1a3a6e; color: #c8d6e5; }`

Pass data down to panels via props — no context needed (single page).

Key data flow:

- `commits` (raw rows) → CommitHeatmap, RepoStatusTable, LocTelemetry
- `eng` (derived metrics) → EngineeringSummary, PrPipeline, TrajectoryBar
- `healthM` (derived metrics) → RecoveryGauge, VitalsReadout, SleepAnalysis, TrajectoryBar
- `sync` → MissionTimer
- Last commit date for T+ → compute from most recent commit row date

- [ ] **Step 2: Lint**

```bash
bun run lint:file -- src/pages/MissionControl.tsx
```

- [ ] **Step 3: Run tests**

```bash
bun run test
```

Expected: All prediction tests still pass (hooks unchanged).

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/MissionControl.tsx
git commit -m "feat(mc-v2): rewrite page layout as 10-panel telemetry grid"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Build**

```bash
bun run build
```

Expected: Build succeeds.

- [ ] **Step 2: Run tests**

```bash
bun run test
```

Expected: All 24 tests pass.

- [ ] **Step 3: Visual verification**
      Navigate to `http://localhost:8081/mission-control` and verify:
- 10 panels visible in a 4-column grid
- Deep navy background, cyan accent text
- Ring gauge rendering (even if no Whoop data — shows "CONNECT WHOOP")
- Commit heatmap with interactive hover
- Repo status table with all repos listed
- Ticking clock and T+ countdown
- Sparklines interactive with hover tooltips
- Mobile responsive: panels stack on narrow viewport

- [ ] **Step 4: Push**

```bash
git push
```
