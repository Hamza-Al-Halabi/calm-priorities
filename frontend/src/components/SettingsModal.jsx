/* ------------------------------------------------------------------
   SettingsModal — everything configurable, in four calm sections:
   · You            name + email
   · Morning email  a daily briefing at a time you choose (desktop app)
   · Deadline reminders  browser/device notification + email before a deadline
   · Your week      which day it starts, weekly goal
   ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { askPermission, notificationsSupported } from "../lib/notifications.js";
import { serverConfigured, apiBase } from "../lib/sync.js";
import { isNativeApp } from "../lib/mobileNotifications.js";

const LEAD_OPTIONS = [
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 180, label: "3 hours before" },
  { value: 1440, label: "1 day before" },
];

const WEEK_STARTS = [
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
];

const field =
  "w-full rounded-xl border border-linen-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-lav-500";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600";
const card = "rounded-2xl border border-linen-200 bg-linen-50/60 p-4";

export default function SettingsModal({ open, settings, tasks, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);
  const [test, setTest] = useState({ state: "idle", message: "" });
  const [perm, setPerm] = useState(() =>
    notificationsSupported() ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setTest({ state: "idle", message: "" });
    }
  }, [open, settings]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email);

  async function enableBrowser() {
    const p = await askPermission();
    setPerm(p);
    if (p === "granted") set({ browserReminders: true });
  }

  async function sendTest() {
    setTest({ state: "busy", message: "Sending…" });
    try {
      const r = await fetch(`${apiBase}/api/send-digest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, settings: draft }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) setTest({ state: "ok", message: `Sent to ${draft.email}. Check your inbox (and spam).` });
      else setTest({ state: "error", message: data.error || "Couldn't send. Check config.json next to the app." });
    } catch {
      setTest({ state: "error", message: "The desktop app isn't reachable." });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        {/* You */}
        <section className={card}>
          <h3 className="text-sm font-bold text-ink-900">You</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={label}>First name</label>
              <input id="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Hamza" className={field} />
            </div>
            <div>
              <label htmlFor="email" className={label}>Your email</label>
              <input id="email" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value.trim() })} placeholder="you@example.com" className={field} />
            </div>
          </div>
        </section>

        {/* Morning email */}
        <section className={card}>
          <h3 className="text-sm font-bold text-ink-900">Morning briefing</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            An email with today's plan, what's overdue, and your weekly progress — so you walk in
            knowing where to start.
          </p>
          {serverConfigured ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-900">
                  <input
                    type="checkbox"
                    checked={draft.morningEmail}
                    disabled={!emailValid}
                    onChange={(e) => set({ morningEmail: e.target.checked })}
                    className="size-4 accent-lav-600 disabled:opacity-40"
                  />
                  Send it every day at
                </label>
                <input
                  type="time"
                  value={draft.digestTime}
                  onChange={(e) => set({ digestTime: e.target.value || "07:00" })}
                  aria-label="Morning email time"
                  className="rounded-xl border border-linen-200 bg-white px-3 py-2 text-sm text-ink-900"
                />
                <button
                  onClick={sendTest}
                  disabled={!emailValid || test.state === "busy"}
                  className="rounded-full border border-lav-200 px-4 py-2 text-sm font-semibold text-lav-700 hover:bg-lav-50 disabled:opacity-40"
                >
                  Send a test now
                </button>
              </div>
              {test.message && (
                <p
                  role="status"
                  className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                    test.state === "error" ? "bg-blush-100 text-blush-700" : "bg-sage-100 text-sage-700"
                  }`}
                >
                  {test.message}
                </p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-ink-400">
                It's sent by the desktop app, so the app needs to be running — if the PC was off at that
                time, it goes out as soon as the app starts (up to 8 hours later).
              </p>
            </>
          ) : (
            <p className="mt-3 rounded-xl bg-brook-100 px-3 py-2 text-sm text-brook-700">
              The morning email is sent by the Windows desktop app (CalmPriorities.exe).
            </p>
          )}
        </section>

        {/* Deadline reminders */}
        <section className={card}>
          <h3 className="text-sm font-bold text-ink-900">Deadline reminders</h3>
          <label htmlFor="lead" className={`${label} mt-3`}>Remind me</label>
          <select id="lead" value={draft.leadMinutes} onChange={(e) => set({ leadMinutes: Number(e.target.value) })} className={field}>
            {LEAD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {isNativeApp ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              On this phone, reminders arrive as device notifications, even when the app is closed.
            </p>
          ) : (
            <div className="mt-3">
              {perm === "unsupported" && <p className="text-sm text-ink-600">This browser doesn't support notifications.</p>}
              {perm === "denied" && (
                <p className="rounded-xl bg-sand-100 px-3 py-2 text-sm text-sand-700">
                  Notifications are blocked for this site. Allow them in your browser's site settings.
                </p>
              )}
              {perm === "default" && (
                <button onClick={enableBrowser} className="rounded-full bg-lav-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lav-500">
                  Turn on browser reminders
                </button>
              )}
              {perm === "granted" && (
                <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-900">
                  <input type="checkbox" checked={draft.browserReminders} onChange={(e) => set({ browserReminders: e.target.checked })} className="size-4 accent-lav-600" />
                  Browser reminders (while the app is open)
                </label>
              )}
            </div>
          )}

          <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold text-ink-900">
            <input
              type="checkbox"
              checked={draft.emailReminders}
              disabled={!emailValid}
              onChange={(e) => set({ emailReminders: e.target.checked })}
              className="size-4 accent-lav-600 disabled:opacity-40"
            />
            Email me before deadlines
          </label>
          {!serverConfigured && (
            <p className="mt-3 rounded-xl bg-brook-100 px-3 py-2 text-sm text-brook-700">
              No reminder server is connected, so emails won't send. See the README.
            </p>
          )}
        </section>

        {/* Week */}
        <section className={card}>
          <h3 className="text-sm font-bold text-ink-900">Your week</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="weekstart" className={label}>Week starts on</label>
              <select id="weekstart" value={draft.weekStart} onChange={(e) => set({ weekStart: Number(e.target.value) })} className={field}>
                {WEEK_STARTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="goal" className={label}>Tasks to finish per week</label>
              <input
                id="goal"
                type="number"
                min={1}
                max={200}
                value={draft.weeklyGoal}
                onChange={(e) => set({ weeklyGoal: Math.max(1, Number(e.target.value) || 1) })}
                className={field}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-linen-100">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="rounded-full bg-lav-600 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-lav-500"
          >
            Save settings
          </button>
        </div>
      </div>
    </Modal>
  );
}
