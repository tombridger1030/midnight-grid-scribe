-- Per-block-kind behavior on clock-out:
--   routine — just clock in/out, no prompt, no LLM
--   note    — clock-out modal asks for notes, saves text, no LLM
--   judged  — clock-out modal asks for results, LLM judges quality (current default)

ALTER TABLE public.schedule_blocks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'judged'
  CHECK (kind IN ('routine', 'note', 'judged'));

-- Re-categorize Tom's blocks
UPDATE public.schedule_blocks SET kind = 'routine' WHERE label IN (
  'Wakeup', 'Shake + Walk', 'Walk', 'BJJ', 'Watch BJJ',
  'Pack + Leave', 'Shower + Clean', 'Meal 3'
);

UPDATE public.schedule_blocks SET kind = 'note' WHERE label IN (
  'Read', 'CEO Interview'
);

-- Cortal Block I/II/III, Workout, Meal, Study stay 'judged' (default)
