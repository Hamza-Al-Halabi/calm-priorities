/* ------------------------------------------------------------------
   TodayView — the screen you open at 8:00.
   · a progress ring for today's plan
   · quick-add straight into the plan
   · "Suggested for today": overdue, carried-over, due soon, high priority
   · up next + progress toward your weekly goal
   ------------------------------------------------------------------ */

import { useState } from "react";
import Ring from "./Ring.jsx";
import FocusItem from "./FocusItem.jsx";
import UpNext from "./UpNext.jsx";
import { PlusIcon } from "./Header.jsx";
import { PRIORITIES, TONES } from "../lib/tones.js";
import { suggestions, todayPlan, streak, weekRange, weekStats } from "../lib/stats.js";

const RANK = { high: 0, medium: 1, low: 2 };

function heroMessage(done, total, hour) {
  if (total === 0)
    return hour < 12
      ? "No plan yet. Pick the 3 things that would make today a good day."
      : "Nothing planned for today. Add what's left, or enjoy the space.";
  if (done === total) return "Today's plan is complete. Take a breath — you've earned it.";
  if (done === 0) return `${total} thing${total === 1 ? "" : "s"} planned. Start with just one.`;
  if (done / total >= 0.5) return "Past halfway. Steady does it.";
  return "One thing at a time — it's working.";
}

function greeting(name, hour) {
  const base =
    hour < 5 ? "Hello, night owl" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${base}, ${name}` : base;
}

export default function TodayView({
  tasks,
  settings,
  now,
  onToggle,
  onEdit,
  onUnplan,
  onPlan,
  onPlanMany,
  onQuickAdd,
  onOpenWeek,
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");

  const { planned, done, total } = todayPlan(tasks, now);
  const sorted = [...planned].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      RANK[a.priority] - RANK[b.priority] ||
      String(a.deadline ?? "9").localeCompare(String(b.deadline ?? "9"))
  );
  const ideas = suggestions(tasks, now);
  const upcoming = tasks
    .filter((t) => t.deadline && !t.done)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4);

  const week = weekStats(tasks, weekRange(now, settings.weekStart, 0), now);
  const goal = Math.max(1, settings.weeklyGoal || 10);
  const days = streak(tasks, now);

  function submit() {
    if (!title.trim()) return;
    onQuickAdd(title.trim(), priority);
    setTitle("");
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        {/* Hero */}
        <section className="animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft sm:p-7">
          <div className="flex items-center gap-5 sm:gap-7">
            <Ring value={done} max={total} size={118} stroke={11} label={`${done} of ${total} planned tasks done`}>
              <span className="font-display text-3xl leading-none text-ink-900">
                {done}
                <span className="text-lg text-ink-400">/{total}</span>
              </span>
              <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-wider text-ink-400">today</span>
            </Ring>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                {now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h2 className="mt-1.5 font-display text-xl font-normal leading-snug text-ink-900 sm:text-2xl">
                {greeting(settings.name, now.getHours())}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {heroMessage(done, total, now.getHours())}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-sand-100 px-2.5 py-1 text-sand-700">
                  {days > 0 ? `🔥 ${days}-day streak` : "Start a streak today"}
                </span>
                <button
                  onClick={onOpenWeek}
                  className="rounded-full bg-lav-100 px-2.5 py-1 text-lav-700 hover:bg-lav-200"
                >
                  Week: {week.completed.length}/{goal} done
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Plan */}
        <section className="animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-5 shadow-soft sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Today's plan</h2>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-linen-200 bg-white p-1.5 focus-within:border-lav-500">
            <div className="flex gap-1 pl-1.5" role="radiogroup" aria-label="Priority for the new task">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={priority === p}
                  aria-label={TONES[p].label}
                  title={TONES[p].label}
                  onClick={() => setPriority(p)}
                  className={`flex size-6 items-center justify-center rounded-full ${
                    priority === p ? "bg-linen-100 ring-2 ring-lav-200" : "hover:bg-linen-50"
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${TONES[p].dot}`} />
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Add something to today… press Enter"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              aria-label="Add a task to today's plan"
            />
            <button
              onClick={submit}
              disabled={!title.trim()}
              aria-label="Add to today's plan"
              className="rounded-full bg-lav-600 p-2 text-white hover:bg-lav-500 disabled:opacity-30"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>

          {sorted.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-linen-300 bg-white/50 px-4 py-7 text-center text-sm text-ink-600">
              Nothing planned yet. Type above, or add from the suggestions.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {sorted.map((t) => (
                <FocusItem
                  key={t.id}
                  task={t}
                  now={now}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onUnplan={onUnplan}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-4">
        {/* Suggestions */}
        <section className="animate-fade-up rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
              Suggested for today
            </h2>
            {ideas.length > 1 && (
              <button
                onClick={() => onPlanMany(ideas.map((i) => i.task.id))}
                className="rounded-full px-2.5 py-1 text-xs font-bold text-lav-700 hover:bg-lav-50"
              >
                Add all
              </button>
            )}
          </div>

          {ideas.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Nothing pressing. Overdue, carried-over and urgent tasks will show up here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {ideas.map(({ task, reason }) => (
                <li key={task.id} className="flex items-center gap-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${TONES[task.priority].dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">{task.title}</span>
                    <span className="text-xs font-semibold text-ink-400">{reason}</span>
                  </span>
                  <button
                    onClick={() => onPlan(task.id)}
                    aria-label={`Add “${task.title}” to today's plan`}
                    className="rounded-full bg-lav-50 px-3 py-1.5 text-xs font-bold text-lav-700 hover:bg-lav-100"
                  >
                    + Today
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <UpNext tasks={upcoming} now={now} />
      </div>
    </div>
  );
}
