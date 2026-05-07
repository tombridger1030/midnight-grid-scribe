import { useEffect, useState } from "react";

/**
 * HH:MM input that fires onChange only when the user picks a different
 * value than the current `value` prop. Local state keeps typing snappy
 * even when the parent re-renders.
 *
 * Visual: bottom-border only, transparent bg, focus → cyan rule. No
 * spinners, no rounding, monospace via inherited font.
 */
export function TimeField({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      type="time"
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        if (e.target.value !== value) onChange(e.target.value);
      }}
      className={`bg-transparent text-white border-b border-[#444] focus:border-[#00D4FF] focus:outline-none ${
        compact ? "px-0.5 text-xs w-24" : "px-1"
      }`}
    />
  );
}
