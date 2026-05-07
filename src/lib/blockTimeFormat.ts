/**
 * Format an ISO timestamp as local HH:MM (24h). Empty string for null.
 * Used to seed <input type="time"> from a block_instance's started_at/ended_at.
 */
export const localHHMM = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
};

/** Drop seconds from a "HH:MM:SS" string. Returns "—" if null. */
export const trimSec = (t: string | null) => (t ? t.slice(0, 5) : "—");
