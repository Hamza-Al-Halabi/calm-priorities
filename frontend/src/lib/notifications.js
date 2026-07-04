/* ------------------------------------------------------------------
   notifications.js — browser notifications.

   HOW BROWSER REMINDERS WORK
   1. The user grants permission once (askPermission below).
   2. While the app is open in a tab, App.jsx runs a check every 30s.
   3. Any unfinished task whose deadline is within `leadMinutes` and
      hasn't been notified yet triggers a system notification, then
      gets flagged (task.notified = true) so it only fires once.

   HONEST LIMITATION: plain browser notifications only fire while the
   tab is open. Notifying a *closed* app needs a service worker + push
   server — that's exactly the gap the email reminders (see /server)
   cover, so we keep this part simple.
   ------------------------------------------------------------------ */

import { formatDeadline } from "./deadlines.js";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Ask the browser for permission. Returns "granted" | "denied" | "default" | "unsupported". */
export async function askPermission() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Tasks that should trigger a browser reminder right now. */
export function dueForBrowserReminder(tasks, leadMinutes, now = new Date()) {
  const lead = leadMinutes * 60 * 1000;
  return tasks.filter((t) => {
    if (t.done || !t.deadline || t.notified) return false;
    const diff = new Date(t.deadline) - now;
    // Within the reminder window, or overdue by less than 5 minutes
    // (so a just-missed deadline still gets one gentle ping — but a
    // task overdue since last week doesn't spam on every app open).
    return diff <= lead && diff > -5 * 60 * 1000;
  });
}

/** Show one calm notification for a task. */
export function showTaskNotification(task) {
  try {
    new Notification("Gentle reminder 🌿", {
      body: `“${task.title}” is due ${formatDeadline(task.deadline)}.`,
      tag: task.id, // same-task notifications replace instead of stacking
    });
  } catch {
    /* some browsers throw when constructed outside a user gesture — ignore */
  }
}
