/* ------------------------------------------------------------------
   WeekView — "by the end of the week I need to see progress".
   · stat tiles: finished, still open, completion rate, streak
   · a bar per day (what you actually finished)
   · weekly goal with a stepper, priority mix, a list of wins
   · still-open tasks with one-click "+ Today"
   Browse back through earlier weeks with the arrows.
   ------------------------------------------------------------------ */

import { useState } from "react";
import Ring from "./Ring.jsx";
import { PRIORITIES, TONES } from "../lib/tones.js";
import { bestDay, dayKey, streak, weekRange, weekStats } from "../lib/stats.js";

const dayName = (d) => d.toLocaleDateString([], { weekday: "short" });
const dayLong = (d) => d.toLocaleDateString([], { weekday: "long" });

function rangeLabel(range) {
  const last = new Date(range.end);
  last.setDate(last.getDate() - 1);
  const f = (d) => d.toLocaleDateString([], { day: "numeric", month: "short" });
  return `${f(range.start)} – ${f(last)}`;
}

function summary(stats, goal, best, range, isCurrent) {
  const n = stats.completed.length;
  if (n === 0)
    return isCurrent
      ? "A fresh week. Plan today and the bars will start to fill."
      : "A quiet week — nothing was ticked off.";
  const bits = [`${n} task${n === 1 ? "" : "s"} finished`];
  if (stats.total > n) bits.push(`${stats.rate}% of what was on your plate`);
  const goalText =
    n >= goal ? "Goal reached — nicely done." : `${goal - n} to go for your goal of ${goal}.`;
  const bestText = best ? ` Strongest day: ${dayLong(range.days[best.index])} (${best.count}).` : "";
  return `${bits.join(" · ")}. ${goalText}${bestText}`;
}

function Tile({ label, value, sub, tone = "text-ink-900" }) {
  return (
    <div className="lift animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className={`mt-1.5 font-display text-4xl leading-none ${tone}`}>{value}</p>
      <p className="mt-1.5 text-xs font-semibold text-ink-600">{sub}</p>
    </div>
  );
}

export default function WeekView({ tasks, settings, now, onSetGoal, onPlan, onEdit }) {
  const [offset, setOffset] = useState(0);
  const range = weekRange(now, settings.weekStart, offset);
  const stats = weekStats(tasks, range, now);
  const goal = Math.max(1, settings.weeklyGoal || 10);
  const best = bestDay(stats.perDay);
  const maxBar = Math.max(1, ...stats.perDay);
  const todayKey = dayKey(now);
  const isCurrent = offset === 0;
  const wins = [...stats.completed].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return (
    <div className="mt-6 space-y-4">
      {/* Week switcher + summary */}
      <section className="animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous week"
              className="rounded-full p-2 text-ink-600 hover:bg-linen-100"
            >
              <Chevron dir="left" />
            </button>
            <button
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={isCurrent}
              aria-label="Next week"
              className="rounded-full p-2 text-ink-600 hover:bg-linen-100 disabled:opacity-30"
            >
              <Chevron dir="right" />
            </button>
          </div>
          <div className="mr-auto">
            <h2 className="font-display text-xl text-ink-900">
              {isCurrent ? "This week" : offset === -1 ? "Last week" : `${-offset} weeks ago`}
            </h2>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">{rangeLabel(range)}</p>
          </div>
          {!isCurrent && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-full bg-lav-100 px-3.5 py-1.5 text-xs font-bold text-lav-700 hover:bg-lav-200"
            >
              Back to this week
            </button>
          )}
        </div>
        <p className="mt-4 max-w-3xl text-[0.95rem] leading-relaxed text-ink-600">
          {summary(stats, goal, best, range, isCurrent)}
        </p>
      </section>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Finished" value={stats.completed.length} sub={`goal ${goal}`} tone="text-sage-700" />
        <Tile
          label="Still open"
          value={stats.open.length}
          sub={stats.overdue > 0 ? `${stats.overdue} overdue overall` : "due or planned this week"}
          tone={stats.open.length > 0 ? "text-sand-700" : "text-ink-900"}
        />
        <Tile label="Completion" value={`${stats.rate}%`} sub={`${stats.completed.length} of ${stats.total}`} tone="text-lav-700" />
        <Tile label="Streak" value={streak(tasks, now)} sub="days in a row" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Bars */}
        <section className="animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Finished per day</h3>
          <div className="mt-5 grid h-44 grid-cols-7 items-end gap-2 sm:gap-3" role="list">
            {range.days.map((d, i) => {
              const n = stats.perDay[i];
              const key = dayKey(d);
              const today = key === todayKey;
              const future = key > todayKey;
              return (
                <div
                  key={key}
                  role="listitem"
                  aria-label={`${dayLong(d)}: ${n} finished`}
                  className="flex h-full flex-col items-center justify-end gap-1.5"
                >
                  <span className={`text-xs font-bold ${n ? "text-ink-900" : "text-ink-400"}`}>{n || "·"}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`animate-grow-up w-full rounded-t-xl rounded-b-md ${
                        today ? "bg-lav-500" : n ? "bg-sage-500" : "bg-linen-100"
                      } ${future ? "opacity-50" : ""}`}
                      style={{ height: n ? `${Math.max(12, (n / maxBar) * 100)}%` : "6px", animationDelay: `${i * 50}ms` }}
                      title={`${dayLong(d)} · ${n} finished`}
                    />
                  </div>
                  <span className={`text-xs font-bold ${today ? "text-lav-700" : "text-ink-400"}`}>{dayName(d)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Goal + mix */}
        <section className="animate-fade-up space-y-5 rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft">
          <div className="flex items-center gap-4">
            <Ring value={stats.completed.length} max={goal} size={96} stroke={9} label="Weekly goal progress">
              <span className="font-display text-2xl leading-none text-ink-900">{Math.min(100, Math.round((stats.completed.length / goal) * 100))}%</span>
            </Ring>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Weekly goal</h3>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={() => onSetGoal(Math.max(1, goal - 1))}
                  aria-label="Lower weekly goal"
                  className="size-7 rounded-full border border-linen-200 text-sm font-bold text-ink-600 hover:bg-linen-100"
                >
                  −
                </button>
                <span className="min-w-8 text-center font-display text-xl text-ink-900">{goal}</span>
                <button
                  onClick={() => onSetGoal(goal + 1)}
                  aria-label="Raise weekly goal"
                  className="size-7 rounded-full border border-linen-200 text-sm font-bold text-ink-600 hover:bg-linen-100"
                >
                  +
                </button>
                <span className="text-xs font-semibold text-ink-400">tasks</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">By priority</h3>
            <ul className="mt-3 space-y-2.5">
              {PRIORITIES.map((p) => {
                const n = stats.byPriority[p];
                const pct = stats.completed.length ? (n / stats.completed.length) * 100 : 0;
                return (
                  <li key={p} className="flex items-center gap-3 text-sm">
                    <span className="w-16 font-semibold text-ink-600">{TONES[p].short}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-linen-100">
                      <div
                        className={`h-full rounded-full ${TONES[p].dot} transition-[width] duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-5 text-right font-bold text-ink-900">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Wins */}
        <section className="animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Wins</h3>
          {wins.length === 0 ? (
            <p className="mt-3 text-sm text-ink-600">Finished tasks will collect here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {wins.slice(0, 12).map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{t.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-ink-400">
                    {dayName(new Date(t.completedAt))}
                  </span>
                </li>
              ))}
              {wins.length > 12 && (
                <li className="text-xs font-semibold text-ink-400">+ {wins.length - 12} more</li>
              )}
            </ul>
          )}
        </section>

        {/* Still open */}
        <section className="animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Still open this week</h3>
          {stats.open.length === 0 ? (
            <p className="mt-3 text-sm text-ink-600">Nothing left over. Lovely.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.open.slice(0, 12).map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 text-sm">
                  <span className={`size-2 shrink-0 rounded-full ${TONES[t.priority].dot}`} />
                  <button
                    onClick={() => onEdit(t)}
                    className="min-w-0 flex-1 truncate text-left font-semibold text-ink-900 hover:text-lav-700"
                  >
                    {t.title}
                  </button>
                  {isCurrent && t.plannedFor !== todayKey && (
                    <button
                      onClick={() => onPlan(t.id)}
                      className="rounded-full bg-lav-50 px-3 py-1 text-xs font-bold text-lav-700 hover:bg-lav-100"
                    >
                      + Today
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
