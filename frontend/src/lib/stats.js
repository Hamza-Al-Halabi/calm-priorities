/* ------------------------------------------------------------------
   stats.js — pure planning + progress logic (no DOM, no React).

   Shared by the UI (Today / Week views) and by the desktop launcher,
   which builds the 7:00 morning email from the very same numbers, so
   the dashboard and the email can never disagree.

   Task fields used here:
     done, completedAt   — when it was finished (ISO)
     plannedFor          — "YYYY-MM-DD": the day you chose to do it
     deadline            — ISO datetime
     priority            — "high" | "medium" | "low"
   ------------------------------------------------------------------ */

export const DAY = 24 * 60 * 60 * 1000;
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const pad = (n) => String(n).padStart(2, "0");

/** Local calendar day as "YYYY-MM-DD" (what `plannedFor` stores). */
export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** First day of the week containing `date`. weekStart: 0=Sun, 1=Mon … 6=Sat. */
export function weekStartOf(date, weekStart = 1) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() - weekStart + 7) % 7));
  return d;
}

/** { start, end (exclusive), days: Date[7] } for the week `offset` weeks from now. */
export function weekRange(now, weekStart = 1, offset = 0) {
  const start = weekStartOf(now, weekStart);
  start.setDate(start.getDate() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end, days };
}

/* ---------- today ---------- */

export function todayPlan(tasks, now = new Date()) {
  const key = dayKey(now);
  const planned = tasks.filter((t) => t.plannedFor === key);
  return { planned, done: planned.filter((t) => t.done).length, total: planned.length };
}

/**
 * Open tasks worth adding to today's plan, most pressing first.
 * Each carries a human `reason` shown in the UI and the email.
 */
export function suggestions(tasks, now = new Date(), limit = 6) {
  const key = dayKey(now);
  const endOfTomorrow = startOfDay(now).getTime() + 2 * DAY;
  const out = [];
  for (const t of tasks) {
    if (t.done || t.plannedFor === key) continue;
    const due = t.deadline ? new Date(t.deadline) : null;
    let reason = null;
    let rank = 9;
    if (due && due < now) (reason = "Overdue"), (rank = 0);
    else if (t.plannedFor && t.plannedFor < key) (reason = "Carried over"), (rank = 1);
    else if (due && due.getTime() < endOfTomorrow)
      (reason = dayKey(due) === key ? "Due today" : "Due tomorrow"), (rank = 2);
    else if (t.priority === "high") (reason = "High priority"), (rank = 3);
    if (reason) out.push({ task: t, reason, rank });
  }
  out.sort(
    (a, b) =>
      a.rank - b.rank ||
      PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority] ||
      String(a.task.deadline ?? "9").localeCompare(String(b.task.deadline ?? "9"))
  );
  return out.slice(0, limit);
}

/** Consecutive days (ending today, or yesterday if today is still empty) with a completed task. */
export function streak(tasks, now = new Date()) {
  const days = new Set(tasks.filter((t) => t.done && t.completedAt).map((t) => dayKey(t.completedAt)));
  const d = startOfDay(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* ---------- a week ---------- */

export function weekStats(tasks, range, now = new Date()) {
  const inRange = (iso) => {
    if (!iso) return false;
    const t = new Date(iso);
    return t >= range.start && t < range.end;
  };
  const firstKey = dayKey(range.days[0]);
  const lastKey = dayKey(range.days[6]);
  const keyInRange = (k) => Boolean(k) && k >= firstKey && k <= lastKey;

  const completed = tasks.filter((t) => t.done && inRange(t.completedAt));
  const perDay = range.days.map((d) => {
    const k = dayKey(d);
    return completed.filter((t) => dayKey(t.completedAt) === k).length;
  });
  const byPriority = { high: 0, medium: 0, low: 0 };
  for (const t of completed) byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;

  // Still open, but belonged to this week (due or planned within it).
  const open = tasks.filter(
    (t) => !t.done && (inRange(t.deadline) || keyInRange(t.plannedFor))
  );
  const total = completed.length + open.length;
  return {
    completed,
    perDay,
    byPriority,
    open,
    total,
    rate: total === 0 ? 0 : Math.round((completed.length / total) * 100),
    overdue: tasks.filter((t) => !t.done && t.deadline && new Date(t.deadline) < now).length,
  };
}

/** Best day of a week as { index, count } or null when nothing was finished. */
export function bestDay(perDay) {
  const max = Math.max(...perDay);
  return max > 0 ? { index: perDay.indexOf(max), count: max } : null;
}
