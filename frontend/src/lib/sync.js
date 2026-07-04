/* ------------------------------------------------------------------
   sync.js — connects the app to the reminder server (/server).

   Email reminders can't be sent from a browser alone: something has to
   be awake when the deadline approaches. So a tiny Express server keeps
   a copy of your upcoming tasks and emails you on schedule (via Resend).

   This module pushes { email, leadMinutes, tasks } to that server
   whenever your tasks change (debounced in App.jsx). Only what the
   server needs is sent: id, title and deadline of unfinished tasks.

   If VITE_API_URL is not set, this quietly does nothing and the app
   stays 100% local.
   ------------------------------------------------------------------ */

// VITE_API_URL meanings:
//   undefined  → no reminder server (pure static deploy)
//   ""         → same origin (desktop .exe build: one server does both)
//   "https://…" → remote reminder server (e.g. Render)
const raw = import.meta.env.VITE_API_URL;
export const apiBase = raw === undefined ? null : raw;
export const serverConfigured = apiBase !== null;

export async function syncToServer(tasks, settings) {
  if (apiBase === null || !settings.emailReminders || !settings.email) return;
  try {
    await fetch(`${apiBase}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: settings.email,
        leadMinutes: settings.leadMinutes,
        tasks: tasks
          .filter((t) => t.deadline && !t.done)
          .map(({ id, title, deadline }) => ({ id, title, deadline })),
      }),
    });
  } catch {
    // Offline or the server is waking up — fine. The next change
    // (or next app open) will sync again.
  }
}
