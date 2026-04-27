import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ProfileSection,
  SecuritySection,
  WhoopSection,
  AdminSection,
} from "@/components/settings";
import {
  type ScheduleBlock,
  archiveBlock,
  createBlock,
  listActiveBlocks,
} from "@/lib/scheduleService";
import {
  type MonthlyGoal,
  createGoal,
  deleteGoal,
  listGoalsForMonth,
  monthLabel,
} from "@/lib/goalsService";
import {
  type AccountabilityRecipient,
  addRecipient,
  deleteRecipient,
  listRecipients,
  sendNow,
  updateRecipient,
} from "@/lib/accountabilityService";

const ACCENT = {
  cyan: "text-[#00D4FF]",
  amber: "text-[#FFB800]",
  red: "text-[#FF3344]",
  muted: "text-[#888888]",
  dim: "text-[#666666]",
  rule: "border-[#333333]",
} as const;

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className={`text-xs ${ACCENT.cyan} mb-3`}>{title}</div>
      <div className="pl-4">{children}</div>
    </section>
  );
}

function ScheduleEditor() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    label: "",
    start_time: "09:00",
    end_time: "11:00",
    days: [1, 2, 3, 4, 5] as number[],
  });

  const reload = () => listActiveBlocks().then(setBlocks);
  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    if (!draft.label.trim() || draft.days.length === 0) return;
    await createBlock({
      label: draft.label.trim(),
      start_time: draft.start_time,
      end_time: draft.end_time,
      days_of_week: draft.days,
    });
    setDraft({
      label: "",
      start_time: "09:00",
      end_time: "11:00",
      days: [1, 2, 3, 4, 5],
    });
    setAdding(false);
    reload();
  };

  const toggleDay = (d: number) =>
    setDraft((prev) => ({
      ...prev,
      days: prev.days.includes(d)
        ? prev.days.filter((x) => x !== d)
        : [...prev.days, d].sort(),
    }));

  return (
    <div>
      {blocks.length === 0 && !adding && (
        <div className={`text-xs ${ACCENT.dim} mb-2`}>no blocks defined</div>
      )}
      {blocks.map((b) => (
        <div key={b.id} className="flex items-baseline gap-4 text-xs mb-1">
          <span className={ACCENT.muted}>
            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
          </span>
          <span className="text-white w-32">{b.label.toUpperCase()}</span>
          <span className={ACCENT.muted}>
            {DAYS.map((d, i) => (
              <span
                key={i}
                className={
                  b.days_of_week.includes(i) ? "text-white" : ACCENT.dim
                }
              >
                {d}
              </span>
            ))}
          </span>
          <span className="flex-1" />
          <button
            onClick={async () => {
              await archiveBlock(b.id);
              reload();
            }}
            className={`${ACCENT.red} hover:underline`}
          >
            ✗ remove
          </button>
        </div>
      ))}

      {adding ? (
        <div className={`mt-3 border ${ACCENT.rule} p-3 space-y-2 text-xs`}>
          <div className="flex gap-2 items-baseline">
            <span className={ACCENT.muted}>LABEL</span>
            <input
              autoFocus
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="deep work 1"
              className="flex-1 bg-black border border-[#444] px-2 py-1 text-white focus:border-[#00D4FF] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 items-baseline">
            <span className={ACCENT.muted}>START</span>
            <input
              type="time"
              value={draft.start_time}
              onChange={(e) =>
                setDraft({ ...draft, start_time: e.target.value })
              }
              className="bg-black border border-[#444] px-2 py-1 text-white focus:border-[#00D4FF] focus:outline-none"
            />
            <span className={ACCENT.muted}>END</span>
            <input
              type="time"
              value={draft.end_time}
              onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
              className="bg-black border border-[#444] px-2 py-1 text-white focus:border-[#00D4FF] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 items-baseline">
            <span className={ACCENT.muted}>DAYS</span>
            {DAYS.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`px-2 py-1 border ${draft.days.includes(i) ? "border-[#00D4FF] text-[#00D4FF]" : "border-[#444] text-[#666]"}`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              className={`px-3 py-1 border ${ACCENT.cyan} border-current hover:bg-[#00D4FF]/10`}
            >
              ▶ ADD
            </button>
            <button
              onClick={() => setAdding(false)}
              className={`px-3 py-1 ${ACCENT.muted} hover:text-white`}
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={`mt-3 text-xs ${ACCENT.cyan} hover:underline`}
        >
          + ADD BLOCK
        </button>
      )}
    </div>
  );
}

function GoalsEditor() {
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    claim: "",
    success_criteria: "",
    threshold: "",
  });

  const reload = () => listGoalsForMonth().then(setGoals);
  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    if (!draft.claim.trim()) return;
    await createGoal({
      claim: draft.claim.trim(),
      success_criteria: draft.success_criteria.trim() || draft.claim.trim(),
      threshold_numeric: draft.threshold ? parseFloat(draft.threshold) : null,
    });
    setDraft({ claim: "", success_criteria: "", threshold: "" });
    setAdding(false);
    reload();
  };

  return (
    <div>
      <div className={`text-xs ${ACCENT.muted} mb-2`}>{monthLabel()}</div>
      {goals.length === 0 && !adding && (
        <div className={`text-xs ${ACCENT.dim}`}>
          no goals set for this month
        </div>
      )}
      {goals.map((g, i) => (
        <div key={g.id} className="flex items-baseline gap-3 text-xs mb-1">
          <span className={ACCENT.muted}>{i + 1}</span>
          <span className="text-white flex-1">{g.claim}</span>
          {g.threshold_numeric !== null && (
            <span className={ACCENT.muted}>≥ {g.threshold_numeric}</span>
          )}
          <button
            onClick={async () => {
              await deleteGoal(g.id);
              reload();
            }}
            className={`${ACCENT.red} hover:underline`}
          >
            ✗
          </button>
        </div>
      ))}

      {adding ? (
        <div className={`mt-3 border ${ACCENT.rule} p-3 space-y-2 text-xs`}>
          <div className="flex gap-2 items-baseline">
            <span className={ACCENT.muted}>CLAIM</span>
            <input
              autoFocus
              value={draft.claim}
              onChange={(e) => setDraft({ ...draft, claim: e.target.value })}
              placeholder="Ship Cortal v1"
              className="flex-1 bg-black border border-[#444] px-2 py-1 text-white focus:border-[#00D4FF] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 items-baseline">
            <span className={ACCENT.muted}>CRITERIA</span>
            <input
              value={draft.success_criteria}
              onChange={(e) =>
                setDraft({ ...draft, success_criteria: e.target.value })
              }
              placeholder="100 paid users on Cortal"
              className="flex-1 bg-black border border-[#444] px-2 py-1 text-white focus:border-[#00D4FF] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 items-baseline">
            <span className={ACCENT.muted}>THRESHOLD</span>
            <input
              value={draft.threshold}
              onChange={(e) =>
                setDraft({ ...draft, threshold: e.target.value })
              }
              placeholder="100 (optional, numeric only)"
              className="flex-1 bg-black border border-[#444] px-2 py-1 text-white focus:border-[#00D4FF] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              className={`px-3 py-1 border ${ACCENT.cyan} border-current hover:bg-[#00D4FF]/10`}
            >
              ▶ ADD
            </button>
            <button
              onClick={() => setAdding(false)}
              className={`px-3 py-1 ${ACCENT.muted} hover:text-white`}
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={`mt-3 text-xs ${ACCENT.cyan} hover:underline`}
        >
          + ADD GOAL
        </button>
      )}
    </div>
  );
}

function AccountabilityEditor() {
  const [recipients, setRecipients] = useState<AccountabilityRecipient[]>([]);
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const reload = () => listRecipients().then(setRecipients);
  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    if (!email.trim()) return;
    await addRecipient({ email: email.trim(), cadence });
    setEmail("");
    reload();
  };

  const triggerSend = async () => {
    setSending(true);
    setStatus(null);
    try {
      const result = await sendNow();
      setStatus(`sent: ${JSON.stringify(result)}`);
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className={`text-xs ${ACCENT.muted} mb-2`}>
        external accountability — daily 06:00 digest. off until recipient added.
      </div>
      {recipients.map((r) => (
        <div key={r.id} className="flex items-baseline gap-3 text-xs mb-1">
          <span className="text-white flex-1">{r.email}</span>
          <button
            onClick={async () => {
              await updateRecipient(r.id, { enabled: !r.enabled });
              reload();
            }}
            className={r.enabled ? "text-[#00C853]" : ACCENT.dim}
          >
            [{r.enabled ? "ON" : "OFF"}]
          </button>
          <span className={ACCENT.muted}>{r.cadence}</span>
          <button
            onClick={async () => {
              await deleteRecipient(r.id);
              reload();
            }}
            className={`${ACCENT.red} hover:underline`}
          >
            ✗
          </button>
        </div>
      ))}

      <div className="flex gap-2 items-baseline mt-3 text-xs">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="flex-1 bg-black border border-[#444] px-2 py-1 text-white focus:border-[#00D4FF] focus:outline-none"
        />
        <select
          value={cadence}
          onChange={(e) => setCadence(e.target.value as "daily" | "weekly")}
          className="bg-black border border-[#444] px-2 py-1 text-white"
        >
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
        </select>
        <button
          onClick={submit}
          className={`px-3 py-1 border ${ACCENT.cyan} border-current hover:bg-[#00D4FF]/10`}
        >
          + ADD
        </button>
      </div>

      {recipients.length > 0 && (
        <div className="mt-3 text-xs">
          <button
            onClick={triggerSend}
            disabled={sending}
            className={`${ACCENT.amber} hover:underline disabled:opacity-30`}
          >
            ▶ {sending ? "sending..." : "send test digest now"}
          </button>
          {status && <div className={`mt-1 ${ACCENT.muted}`}>{status}</div>}
        </div>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white font-mono px-6 py-6 text-sm">
      <div className="max-w-3xl mx-auto">
        <div className={`border-t-2 border-b-2 ${ACCENT.rule} py-2 mb-6`}>
          <div className="flex items-center justify-between text-xs">
            <span>
              <span className={ACCENT.cyan}>NOCTISIUM</span> · SETTINGS
            </span>
            <Link to="/" className={`text-xs ${ACCENT.muted} hover:underline`}>
              ◀ TERMINAL
            </Link>
          </div>
        </div>

        <Section title="SCHEDULE">
          <ScheduleEditor />
        </Section>

        <Section title="MONTH GOALS">
          <GoalsEditor />
        </Section>

        <Section title="ACCOUNTABILITY">
          <AccountabilityEditor />
        </Section>

        <Section title="WHOOP">
          <div className="text-white">
            <WhoopSection />
          </div>
        </Section>

        <Section title="PROFILE">
          <div className="text-white">
            <ProfileSection />
          </div>
        </Section>

        <Section title="SECURITY">
          <div className="text-white">
            <SecuritySection />
          </div>
        </Section>

        {profile?.is_admin && (
          <Section title="ADMIN">
            <div className="text-white">
              <AdminSection />
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

export default Settings;
