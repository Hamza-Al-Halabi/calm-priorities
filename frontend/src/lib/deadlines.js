/* ------------------------------------------------------------------
   deadlines.js — everything about time in one place.
   ------------------------------------------------------------------ */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Classify a task's deadline relative to `now`.
 * Returns: "none" | "done" | "overdue" | "soon" (within 24h) | "later"
 */
export function deadlineState(task, now = new Date()) {
  if (!task.deadline) return "none";
  if (task.done) return "done";
  const diff = new Date(task.deadline) - now;
  if (diff < 0) return "overdue";
  if (diff <= DAY) return "soon";
  return "later";
}

/** Friendly, short deadline text: "Today · 14:30", "Tomorrow · 09:00", "12 Aug · 14:00" */
export function formatDeadline(iso, now = new Date()) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Tomorrow · ${time}`;
  if (dayDiff === -1) return `Yesterday · ${time}`;
  const date = d.toLocaleDateString([], { day: "numeric", month: "short" });
  return `${date} · ${time}`;
}

/** Convert a stored ISO string to the value a <input type="datetime-local"> expects. */
export function toInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Sort: tasks with deadlines first (soonest on top), then no-deadline, done at the bottom. */
export function sortTasks(list) {
  const rank = (t) => (t.done ? 2 : t.deadline ? 0 : 1);
  return [...list].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.deadline && b.deadline ? new Date(a.deadline) - new Date(b.deadline) : 0) ||
      String(a.createdAt).localeCompare(String(b.createdAt))
  );
}
