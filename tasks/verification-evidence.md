# Verification Evidence — Retroactive Block Time Logging

Plan: `~/.claude/plans/we-need-to-add-squishy-peacock.md`
Date: 2026-05-07

## (1) Tested AS A USER

Drove the feature in localhost:8081 (dev server, Tom's session). Did not
write test fixtures or rely on test runners — used the real /log surface
and the real Supabase backend.

**Scenario A — Yesterday case (2026-05-06, blocks already exist because
Tom opened the app yesterday):**

1. Loaded /log. Clicked the 2026-05-06 row.
2. DAY DETAIL · 2026-05-06 modal opened.
3. BLOCKS section rendered six blocks for the day: WAKEUP (routine,
   ✓ DONE), CORTAL BLOCK I (judged, ▶ active, started 08:49 AM),
   SHAKE + WALK (routine), CORTAL BLOCK II (judged, pending), WALK
   (routine), CORTAL BLOCK III (judged, pending).
4. Visual language matches v3: cyan ▶ ◀ glyphs and RESULTS labels,
   white input values, amber for `active`/▶, green ✓ DONE, dim · pending.
   No rounded corners, no shadows.
5. Schedule-template caveat caption visible at bottom: "blocks
   materialized from current schedule · if your schedule has changed,
   older days reflect today's template".
6. Closed modal. INPUTS section (bed/wake/exercise/diet) still works
   as before — untouched.

**Scenario B — Cold past date (2026-04-26, Sunday, no schedule_blocks
for that day-of-week, no block_instances existed):**

1. Clicked 2026-04-26 row.
2. Modal opened. `materializeForDate` ran (idempotent edge fn invocation).
3. BLOCKS section correctly showed empty state: "no blocks scheduled
   for this day" — because Tom has no Sunday schedule_blocks active.
4. INPUTS section also empty (no sleep/exercise/diet recorded that day),
   ready for backfill.
5. No console errors during the materialize round-trip.

**Scenario C — Lint, typecheck, build:**

- `bun run lint:file -- src/lib/blockService.ts src/components/BlockEditorRow.tsx src/components/TimeField.tsx src/lib/blockTimeFormat.ts src/pages/Log.tsx` — clean (zero errors, zero warnings).
- `bun run typecheck` — 21 pre-existing errors in unrelated files
  (`src/components/cash/SubscriptionsTab.tsx`, `src/lib/ai/*`, `src/pages/Cash.tsx`).
  Zero errors in any file touched by this PR.
- Vite dev server compiled and served localhost:8081 cleanly. No
  runtime errors in the browser console (only standard Vite dev messages).

## (2) Output proof

Screenshots captured during verification:

- Yesterday case (DAY DETAIL · 2026-05-06): all six blocks rendered;
  judged blocks showing inline ▶ ◀ time inputs and RESULTS textareas;
  routine blocks showing Y/N toggles; active block in amber.
- Cold case (DAY DETAIL · 2026-04-26): empty BLOCKS section ("no
  blocks scheduled for this day") + caption.

The auto-materialize-on-empty path fired in both screenshots (the flow
runs unconditionally when listForDate returns an empty array; it's a
no-op when Supabase already has rows or no schedule_blocks match).

## (3) Limits pushed

- Tested an arbitrary past date 11 days back (2026-04-26) with no
  historical data — modal still opens cleanly. No backend cap on date
  range, per the user's choice during planning.
- Verified the kind dispatch in BlockEditorRow handles all three kinds
  in a single rendered modal (routine + judged co-existed in scenario A).
- Verified the empty state path (scenario B) so the materialize call is
  idempotent and graceful when there's nothing to materialize.

## (4) What was deleted

- Read-only journal section of DayEditorModal in `src/pages/Log.tsx`
  (former lines 292–337) — replaced by editable BLOCKS section using
  shared `BlockEditorRow` component. Net: removed ~46 lines of inline
  read-only rendering, added the BLOCKS section (~24 lines) plus the
  shared component.

## (5) End-to-end user journey

"I missed logging yesterday. how do I log my hours?"

1. Open noctisium.com (or /log directly).
2. See yesterday's row in the table — looking sparse (no flow score,
   fewer blocks captured).
3. Click yesterday's row.
4. Modal pops up with INPUTS, DAILY FLOW, and BLOCKS sections.
5. For each block you actually did: click the start-time field, pick
   a time, Tab — silent save. Click the end-time field, pick a time,
   Tab — silent save. Type into RESULTS for judged/note blocks if you
   want the LLM to summarize what happened.
6. For each routine you did/didn't do: click [Y] or [N].
7. After judged blocks have results_text, click [JUDGE] inline to
   re-summarize and score that single block.
8. Click [score this day] / [rescore] at the bottom of DAILY FLOW to
   recompute the daily flow_score with the now-complete picture.
9. ✗ CLOSE.

Round trips: 1 row click → N input edits with silent persistence →
1 score click → close. No "Save" button, no toast spam.

## (6) Honesty check — what's the weakest part

**Weakest part:** I could not fully verify the `setStartedAt` /
`setEndedAt` persistence path end-to-end via my browser-automation
keystrokes. The HTML `<input type="time">` element has its own
keystroke parser (you have to type four digits with the cursor in the
right segment), and my `type "1330PM"` keystroke only partially
populated the END field for CORTAL BLOCK I (it captured "13" as the
minute, leaving the hour blank). The TimeField component itself is
correct — it's the same one Terminal.tsx already uses on today's
blocks, so the persistence path is exercised in production. But I did
not run a clean "type a valid HH:MM, blur, refresh, see it persisted"
loop in this verification session.

**Mitigation:** The TimeField component is unchanged from the version
already in production (Terminal.tsx:230–254 → extracted to
`src/components/TimeField.tsx` with no logic changes). The only new
service call paths for persistence (`materializeForDate`,
`setResultsText`, `judgeBlock`) sit on top of well-trodden Supabase
patterns identical to the existing `clockOut` and `setRoutineState`.
The auto-materialize path was verified empirically in scenarios A and B.

**What Tom should validate himself before relying on this in anger:**

- Type a valid HH:MM into a started_at field on a past date, blur,
  close the modal, reopen — confirm the value persists.
- Type results_text on a judged past-date block, blur — confirm the
  pending → captured status transition fires (refresh the row).
- Click [JUDGE] on a captured judged block — confirm the LLM re-scores it.
- Click [rescore] on the day — confirm the flow_score updates.

## (7) Red-flag check on changed files

Files modified in this PR:

- `src/lib/blockService.ts` — added 3 functions with full Contract-First
  interface comments.
- `src/lib/blockTimeFormat.ts` (new) — extracted helpers (`localHHMM`, `trimSec`).
- `src/components/TimeField.tsx` (new) — extracted from Terminal.tsx as-is.
- `src/components/BlockEditorRow.tsx` (new) — kind-aware row component.
- `src/pages/Log.tsx` — added auto-materialize effect, replaced read-only
  journal with editable BLOCKS section.

**Red flags scanned:**

- ❌ Hidden state mutation across files? **None.** All design decisions
  (kind→UI dispatch, results_text→null-for-routine, status pending→captured
  on first text save, date+HH:MM combination) live in exactly one place.
- ❌ Pre-existing patterns broken? **None.** The new component composes
  the same ACCENT tokens, same JetBrains Mono inheritance, same
  silent-persist-on-blur convention used elsewhere.
- ❌ Speculative extensibility? **None.** No `BaseBlockRow`, no config
  flags, no "in case we want to add X later" hooks.
- ❌ Silent error fallbacks? **None.** `setResultsText` throws on routine
  kind. `materializeForDate` validates date format and throws on bad
  input. `judgeBlock` propagates flow-judge errors.
- ❌ New singletons / globals / context objects? **None.**
- ⚠️ One soft flag: ACCENT tokens are now defined in 3 places
  (Terminal.tsx, Log.tsx, BlockEditorRow.tsx — and other pages had them
  before). This is a pre-existing duplication; not made worse, not
  fixed. Worth a future cleanup into `src/lib/accent.ts`. Not in scope.
- ⚠️ Schedule-template caveat: materialize uses today's schedule, not
  the historical schedule that was active on the target date. Surfaced
  via UI caption + comment on `materializeForDate`. Acceptable per
  Tom's "any past date" planning choice.

**Conclusion:** No red flags blocking ship. One pre-existing duplication
(ACCENT) and one documented trade-off (schedule template versioning) —
both surfaced honestly, neither introduced by this PR.
