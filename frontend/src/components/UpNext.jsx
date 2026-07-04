/* ------------------------------------------------------------------
   UpNext — the next few deadlines at a glance, gently color-coded:
   dusty blush = overdue, warm sand = within 24h, soft blue = later.
   ------------------------------------------------------------------ */

import { deadlineState, formatDeadline } from "../lib/deadlines.js";
import { TONES, DEADLINE_BADGES } from "../lib/tones.js";

const STATE_LABEL = { overdue: "Overdue", soon: "Due soon", later: "" };

export default function UpNext({ tasks, now }) {
  return (
    <section className="rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft sm:p-7">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Up next</h2>

      {tasks.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          No deadlines on the horizon. When a task has one, it appears here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {tasks.map((t) => {
            const state = deadlineState(t, now);
            return (
              <li key={t.id} className="flex items-center gap-3">
                <span
                  className={`size-2 shrink-0 rounded-full ${TONES[t.priority].dot}`}
                  title={TONES[t.priority].label}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                  {t.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${DEADLINE_BADGES[state]}`}
                >
                  {STATE_LABEL[state] ? `${STATE_LABEL[state]} · ` : ""}
                  {formatDeadline(t.deadline, now)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
