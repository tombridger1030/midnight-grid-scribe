import { useEffect, useState } from "react";
import {
  type BlockInstanceWithLabel,
  judgeBlock,
  setEndedAt,
  setResultsText,
  setRoutineState,
  setStartedAt,
} from "../lib/blockService";
import { localHHMM, trimSec } from "../lib/blockTimeFormat";
import { TimeField } from "./TimeField";

const ACCENT = {
  cyan: "text-[#00D4FF]",
  amber: "text-[#FFB800]",
  red: "text-[#FF3344]",
  green: "text-[#00C853]",
  muted: "text-[#888888]",
  dim: "text-[#666666]",
} as const;

/**
 * One editable row for a single block_instance, kind-aware:
 *   routine — Y / N toggle (no times, no text)
 *   note    — start + end + results text
 *   judged  — start + end + results text + verdict/score + JUDGE button
 *
 * Used by /log DayEditorModal for retroactive logging on past dates, and
 * (planned follow-up) by Terminal home for today's blocks. The component
 * hides the kind→UI dispatch and all save semantics from its callers.
 *
 * Pre:  block.id is a real, current-user-owned block_instance row.
 * Pre:  date matches block.date (used to combine HH:MM into timestamps).
 * Post: server state updated on input blur; onChange() fires once per save.
 *
 * Save semantics: silent persistence on blur — no toasts, no Save button.
 * Errors propagate to console; the row stays editable so the user can retry.
 */
export function BlockEditorRow({
  block,
  date,
  onChange,
}: {
  block: BlockInstanceWithLabel;
  date: string;
  onChange: () => void;
}) {
  const planned =
    block.start_time && block.end_time
      ? `${trimSec(block.start_time)}–${trimSec(block.end_time)}`
      : "—";
  const label = block.label.toUpperCase();

  if (block.kind === "routine") {
    const value: boolean | null =
      block.status === "captured"
        ? true
        : block.status === "skipped"
          ? false
          : null;
    const status = routineStatusText(block.status);
    return (
      <div className="flex items-center gap-4 text-xs leading-6">
        <span className={`w-24 ${ACCENT.muted}`}>{planned}</span>
        <span className="w-40 truncate text-white">{label}</span>
        <span className="flex-1">{status}</span>
        <RoutineToggle
          value={value}
          onChange={async (v) => {
            await setRoutineState(block.id, v);
            onChange();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs leading-6 border-b border-[#222] pb-2">
      <div className="flex items-center gap-4">
        <span className={`w-24 ${ACCENT.muted}`}>{planned}</span>
        <span className="w-40 truncate text-white">{label}</span>
        <span className={`${ACCENT.dim} flex items-center gap-2`}>
          <span className={ACCENT.cyan}>▶</span>
          <TimeField
            value={localHHMM(block.started_at)}
            onChange={async (hhmm) => {
              if (!hhmm) return;
              await setStartedAt(block.id, date, hhmm);
              onChange();
            }}
            compact
          />
          <span className={ACCENT.cyan}>◀</span>
          <TimeField
            value={localHHMM(block.ended_at)}
            onChange={async (hhmm) => {
              if (!hhmm) return;
              await setEndedAt(block.id, date, hhmm);
              onChange();
            }}
            compact
          />
        </span>
        <BlockStatusGlyph status={block.status} />
      </div>
      <ResultsTextArea block={block} onChange={onChange} />
      {block.kind === "judged" && (
        <JudgedTail block={block} onChange={onChange} />
      )}
    </div>
  );
}

function routineStatusText(status: string) {
  if (status === "captured")
    return <span className={ACCENT.green}>✓ DONE</span>;
  if (status === "skipped")
    return <span className={ACCENT.red}>✗ SKIPPED</span>;
  if (status === "missed") return <span className={ACCENT.red}>MISSED</span>;
  return <span className={ACCENT.dim}>·</span>;
}

function BlockStatusGlyph({ status }: { status: string }) {
  if (status === "captured")
    return <span className={ACCENT.green}>✓ captured</span>;
  if (status === "active")
    return <span className={ACCENT.amber}>▶ active</span>;
  if (status === "missed") return <span className={ACCENT.red}>✗ missed</span>;
  if (status === "skipped")
    return <span className={ACCENT.dim}>✗ skipped</span>;
  return <span className={ACCENT.dim}>· pending</span>;
}

function RoutineToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const cell = (key: "Y" | "N", active: boolean) => (
    <button
      onClick={() =>
        onChange(active && value === (key === "Y") ? null : key === "Y")
      }
      className={`px-2 ${
        active ? (key === "Y" ? ACCENT.green : ACCENT.red) : ACCENT.dim
      } hover:text-white text-xs`}
    >
      [{active ? key : "·"}]
    </button>
  );
  return (
    <span className="inline-flex">
      {cell("Y", value === true)}
      {cell("N", value === false)}
    </span>
  );
}

/**
 * Multi-line results editor that blur-saves. Local state keeps typing
 * snappy; on blur, persists if changed and triggers parent reload.
 */
function ResultsTextArea({
  block,
  onChange,
}: {
  block: BlockInstanceWithLabel;
  onChange: () => void;
}) {
  const [text, setText] = useState(block.results_text ?? "");
  useEffect(() => setText(block.results_text ?? ""), [block.results_text]);

  return (
    <div className="flex items-start gap-2 pl-28">
      <span className={`${ACCENT.cyan} pt-0.5`}>RESULTS</span>
      <textarea
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => {
          if (text === (block.results_text ?? "")) return;
          await setResultsText(block.id, block.kind, text);
          onChange();
        }}
        placeholder={
          block.kind === "judged"
            ? "what got shipped, blockers, decisions…"
            : "notes…"
        }
        className="flex-1 bg-transparent text-white border-b border-[#222] focus:border-[#00D4FF] focus:outline-none resize-none placeholder:text-[#444]"
      />
    </div>
  );
}

/**
 * For judged blocks: shows current verdict/score and a JUDGE button that
 * re-invokes flow-judge after retroactive edits. Hidden until the block
 * has results_text (otherwise judging would have nothing to read).
 */
function JudgedTail({
  block,
  onChange,
}: {
  block: BlockInstanceWithLabel;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const hasText = (block.results_text ?? "").trim().length > 0;
  const verdict = block.quality_verdict ?? block.results_summary;

  return (
    <div className="flex items-center gap-3 pl-28">
      {block.quality_score !== null && (
        <span className={`${qualityClass(block.quality_score)} font-bold`}>
          {block.quality_score}
        </span>
      )}
      {verdict && (
        <span className={`${ACCENT.muted} truncate max-w-[28rem]`}>
          "{verdict}"
        </span>
      )}
      {hasText && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await judgeBlock(block.id);
              onChange();
            } finally {
              setBusy(false);
            }
          }}
          className={`${ACCENT.amber} hover:underline disabled:opacity-50`}
        >
          [{busy ? "JUDGING…" : "JUDGE"}]
        </button>
      )}
    </div>
  );
}

function qualityClass(score: number) {
  if (score >= 80) return ACCENT.green;
  if (score >= 60) return "text-white";
  if (score >= 40) return ACCENT.amber;
  return ACCENT.red;
}
