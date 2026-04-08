import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { focusTokens } from "@/styles/focus-tokens";
import {
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
  type FocusSession,
  type FocusSessionDraft,
} from "@/lib/focusService";

interface EditFocusSessionDialogProps {
  session: FocusSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sessionId: string, draft: FocusSessionDraft) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
}

function fieldClassName(): string {
  return [
    "mt-2 w-full border bg-black px-3 py-2 font-mono text-sm outline-none transition-colors",
    "focus:border-white/30 focus:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
  ].join(" ");
}

export function EditFocusSessionDialog({
  session,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: EditFocusSessionDialogProps) {
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    setStartedAt(toLocalDateTimeInputValue(session.started_at));
    setEndedAt(session.ended_at ? toLocalDateTimeInputValue(session.ended_at) : "");
    setNote(session.note ?? "");
  }, [session]);

  if (!session) return null;

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(session.id, {
        startedAt: fromLocalDateTimeInputValue(startedAt),
        endedAt: endedAt ? fromLocalDateTimeInputValue(endedAt) : null,
        note,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this focus session?")) return;

    setBusy(true);
    try {
      await onDelete(session.id);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl border p-0"
        style={{
          backgroundColor: focusTokens.colors.panel,
          borderColor: focusTokens.colors.borderStrong,
          color: focusTokens.colors.text,
        }}
      >
        <DialogHeader className="border-b px-6 py-5 text-left" style={{ borderColor: focusTokens.colors.border }}>
          <DialogTitle className="font-mono text-xl uppercase tracking-[0.22em]">
            Edit Session
          </DialogTitle>
          <DialogDescription
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: focusTokens.colors.textDim }}
          >
            Correct the exact start and finish window when needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-left">
              <span
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: focusTokens.colors.textDim }}
              >
                Start
              </span>
              <input
                type="datetime-local"
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
                className={fieldClassName()}
                style={{
                  borderColor: focusTokens.colors.border,
                  color: focusTokens.colors.text,
                }}
              />
            </label>

            <label className="block text-left">
              <span
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: focusTokens.colors.textDim }}
              >
                End
              </span>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={(event) => setEndedAt(event.target.value)}
                className={fieldClassName()}
                style={{
                  borderColor: focusTokens.colors.border,
                  color: focusTokens.colors.text,
                }}
              />
            </label>
          </div>

          <label className="block text-left">
            <span
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ color: focusTokens.colors.textDim }}
            >
              Note
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Optional session note"
              className={fieldClassName()}
              style={{
                borderColor: focusTokens.colors.border,
                color: focusTokens.colors.text,
              }}
            />
          </label>
        </div>

        <div
          className="flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: focusTokens.colors.border }}
        >
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="border px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] transition-colors hover:bg-white/5 disabled:opacity-60"
            style={{
              borderColor: "rgba(255, 142, 142, 0.4)",
              color: focusTokens.colors.danger,
            }}
          >
            Delete Session
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="border px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] transition-colors hover:bg-white/5 disabled:opacity-60"
              style={{
                borderColor: focusTokens.colors.border,
                color: focusTokens.colors.textMuted,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !startedAt}
              className="border px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] transition-colors disabled:opacity-60"
              style={{
                borderColor: "rgba(174, 247, 168, 0.4)",
                color: focusTokens.colors.successStrong,
                backgroundColor: "rgba(174, 247, 168, 0.08)",
              }}
            >
              Save Window
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditFocusSessionDialog;
