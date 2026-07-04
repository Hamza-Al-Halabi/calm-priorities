/* ------------------------------------------------------------------
   RemindersModal — the two reminder channels, explained plainly:
   · In this browser: works while the app is open in a tab.
   · By email: works even when the app is closed (needs the /server
     reminder service — a hint shows if it isn't connected yet).
   ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { askPermission, notificationsSupported } from "../lib/notifications.js";
import { serverConfigured } from "../lib/sync.js";
import { isNativeApp } from "../lib/mobileNotifications.js";

const LEAD_OPTIONS = [
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 180, label: "3 hours before" },
  { value: 1440, label: "1 day before" },
];

export default function RemindersModal({ open, settings, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);
  const [perm, setPerm] = useState(() =>
    notificationsSupported() ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  async function enableBrowser() {
    const p = await askPermission();
    setPerm(p);
    if (p === "granted") setDraft((d) => ({ ...d, browserReminders: true }));
  }

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email);

  return (
    <Modal open={open} onClose={onClose} title="Reminders">
      <div className="space-y-6">
        {/* Shared timing */}
        <div>
          <label htmlFor="lead" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
            Remind me
          </label>
          <select
            id="lead"
            value={draft.leadMinutes}
            onChange={(e) => setDraft((d) => ({ ...d, leadMinutes: Number(e.target.value) }))}
            className="w-full rounded-xl border border-linen-200 bg-white px-3.5 py-2.5 text-sm text-ink-900"
          >
            {LEAD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Browser / device notifications */}
        <section className="rounded-2xl border border-linen-200 bg-linen-50/60 p-4">
          {isNativeApp ? (
            <>
              <h3 className="text-sm font-bold text-ink-900">On this phone</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Reminders are scheduled automatically as device notifications — they arrive on
                time even when the app is closed. Nothing to set up here.
              </p>
            </>
          ) : (
            <>
          <h3 className="text-sm font-bold text-ink-900">In this browser</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            A gentle system notification while the app is open in a tab.
          </p>

          {perm === "unsupported" && (
            <p className="mt-3 text-sm text-ink-600">This browser doesn't support notifications.</p>
          )}

          {perm === "denied" && (
            <p className="mt-3 rounded-xl bg-sand-100 px-3 py-2 text-sm text-sand-700">
              Notifications are blocked for this site. Allow them in your browser's site settings
              (the icon next to the address bar), then reopen this window.
            </p>
          )}

          {perm === "default" && (
            <button
              onClick={enableBrowser}
              className="mt-3 rounded-full bg-lav-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lav-500"
            >
              Turn on browser reminders
            </button>
          )}

          {perm === "granted" && (
            <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold text-ink-900">
              <input
                type="checkbox"
                checked={draft.browserReminders}
                onChange={(e) => setDraft((d) => ({ ...d, browserReminders: e.target.checked }))}
                className="size-4 accent-lav-600"
              />
              Browser reminders are {draft.browserReminders ? "on" : "off"}
            </label>
          )}
            </>
          )}
        </section>

        {/* Email reminders */}
        <section className="rounded-2xl border border-linen-200 bg-linen-50/60 p-4">
          <h3 className="text-sm font-bold text-ink-900">By email</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Works even when the app is closed. Your upcoming tasks are shared with your reminder
            server so it can email you in time.
          </p>

          <label htmlFor="email" className="mt-3 mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
            Your email
          </label>
          <input
            id="email"
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value.trim() }))}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-linen-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-lav-500"
          />

          <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold text-ink-900">
            <input
              type="checkbox"
              checked={draft.emailReminders}
              disabled={!emailValid}
              onChange={(e) => setDraft((d) => ({ ...d, emailReminders: e.target.checked }))}
              className="size-4 accent-lav-600 disabled:opacity-40"
            />
            Email me before deadlines
          </label>

          {!serverConfigured && (
            <p className="mt-3 rounded-xl bg-brook-100 px-3 py-2 text-sm text-brook-700">
              No reminder server is connected yet, so emails won't send. See the README →
              "Email reminders" to set one up in a few minutes.
            </p>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-linen-100"
          >
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
