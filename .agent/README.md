# Noctisium — Operator Terminal

**v3 (2026-04-28)**: Bloomberg-style data tracker. Bloated KPI/sprint/skill/content/focus system replaced with 6 routes, 8 tables, 3 edge functions, plus a click-to-inspect analytics surface.

---

## What it is

A private platform that tracks how the operator **works**, **sleeps**, and **thinks-on-paper**, derives a daily flow score from those inputs via an LLM, and sends an external accountability digest by email.

## Surfaces (6 routes)

| Route        | Purpose                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`          | Terminal home: INPUTS row · today's schedule (clock-in/out for work, Y/N for routine) · DAILY FLOW · MONTH GOALS · 7-day table                                                 |
| `/log`       | Historical data table, 7/30/90/365d, summary stats, CSV export. Sleep σ7 computed client-side (local time)                                                                     |
| `/analytics` | Bloomberg-dense SVG charts: per-block score trends, day-of-week bars, latency, sleep→flow scatter, daily flow line. Every point clickable → DAY DETAIL panel with full context |
| `/blog`      | Free writing — `<textarea>` + react-markdown preview, debounced autosave, no AI critique                                                                                       |
| `/cash`      | Subscriptions + investments (untouched from prior architecture)                                                                                                                |
| `/settings`  | Schedule editor · monthly goals · accountability email · sleep target · profile/security                                                                                       |

## What it tracks

- **Sleep**: bedtime + wake time. `sleep_hours` is a generated column derived from those two timestamps. 7-day rolling σ shows consistency vs `operator_settings.target_bedtime/target_wake_time`, computed client-side (local-time-correct). No Whoop integration — fully self-reported.
- **Exercise**: Y/N daily.
- **Diet**: Y/N daily (followed plan or didn't).
- **Schedule blocks** — three kinds:
  - `routine` (Wakeup, Walk, Meal, BJJ, Shake+Walk, etc.): Y/N toggle, no time tracking, revertible. No LLM judgment.
  - `note` (Read, CEO Interview): clock in/out + free-text notes, no LLM judgment.
  - `judged` (Cortal Block I/II/III, Workout, Study): clock in/out + results text → `flow-judge` edge fn emits `quality_score` (0-100) + one-line verdict via Sonnet 4.6 tool_use.
  - `started_at` and `ended_at` are inline-editable on judged/note rows for late clock-ins or forgotten clock-outs.
- **Daily flow score**: 0-100 + one-line verdict, emitted by `flow-judge` edge function.
- **Monthly goals**: binary hit/missed end-of-month, naive on-track/at-risk heuristic during the month.

## What it intentionally does NOT do

- XP, levels, ranks, streaks
- Habit tracking ceremony
- Memory/prediction/firewall/learning surfaces (prior plan iterations rejected)
- AI critique on blog (free writing only)
- Public-facing pages
- Celebration UX (no green checkmarks, confetti, "great work!" toasts)

If feature creep starts pulling toward any of the above: stop and revisit `/Users/tombridger/.claude/plans/there-are-a-couple-snug-scone.md`.

---

## System

- **Stack**: React + Vite + Supabase + Tailwind. Bun, not npm.
- **Auth**: Supabase email/password; minimal `<TerminalLogin />` in `App.tsx`.
- **Edge functions** (`supabase/functions/`):
  - `flow-judge` — `summarize_block` (Haiku 4.5, prompt-cached) + `score_day` (Sonnet 4.6 via tool_use)
  - `accountability-digest` — Bloomberg-styled plain-text email via Resend, cron + manual modes
  - `operator-cron` — daily idempotent (Terminal calls once per day): materialize today's block_instances from schedule_blocks template, refresh monthly_goals.status. Sleep σ7 is computed client-side (the SQL helper exists but is UTC-broken for non-UTC users — display path bypasses it).
  - `ai-proxy` — preserved
- **Visual language**: pure black `#000`, JetBrains Mono everywhere. Amber=active/today, cyan=data labels, red=missed/at-risk, green=hit. No rounded corners, shadows, gradients. ═══ ─── separators, `▶ ◀ ✗ ✓ ·` glyphs.

## Documentation

- **System/database_schema.md** — current schema (v3 + legacy)
- **SOP/development_sop.md** — coding standards
- **tasks/** — feature specs (mostly v1/v2 history, deprecated)

## Cleaned up in Wave 0 (2026-04-27)

~110-130 src/ files deleted (~33% reduction): MissionControl, Visualizer, Activity, Focus, Content (all nested), Dashboard, DailyReview, WeeklyLog, KPIManage, Kanban, Schedule, Progression pages; mission-control/, analytics/, focus/, content/, cyberpunk/, dashboard/, daily/, weekly/, schedule/, progression/, activity/ component dirs; 17 of 20 hooks; KPI/sprint/skill/rank/weekly/storage lib code (storage.ts alone was 3788 lines). All Codex v1 scaffolding (BlogPublic, flow-coach edge fn) also removed.

## Status

**v3 shipped to production** as commit `231ce5d` (PR #15, merged 2026-04-28). Site live at noctisium.com. 73 migrations applied to Supabase project `ojwugyeyecddsoecpffs`.

**Last updated**: 2026-04-28
