/* ------------------------------------------------------------------
   mobileNotifications.js — native notifications for the Android app.

   In the APK (Capacitor), browser Notification API isn't available —
   instead we schedule real system notifications with
   @capacitor/local-notifications. They fire ON TIME even when the app
   is closed, because Android itself delivers them.

   Strategy: whenever tasks or the lead time change, App.jsx calls
   rescheduleAll() — we cancel everything pending and schedule one
   notification per upcoming task at (deadline − leadMinutes).

   On the web build every function here is a silent no-op.
   ------------------------------------------------------------------ */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { formatDeadline } from "./deadlines.js";

export const isNativeApp = Capacitor.isNativePlatform();

/** Android 13+ shows a permission dialog; earlier versions just allow. */
export async function ensureNativePermission() {
  if (!isNativeApp) return false;
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === "granted";
  } catch {
    return false;
  }
}

/** Stable int32 id from the task's uuid (plugin ids must be Java ints). */
function intId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export async function rescheduleAll(tasks, leadMinutes) {
  if (!isNativeApp) return;
  try {
    // Start clean: cancel whatever was scheduled before.
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) await LocalNotifications.cancel(pending);

    const now = Date.now();
    const notifications = tasks
      .filter((t) => !t.done && t.deadline)
      .map((t) => ({ task: t, at: new Date(t.deadline).getTime() - leadMinutes * 60 * 1000 }))
      .filter((x) => x.at > now)
      .sort((a, b) => a.at - b.at)
      .slice(0, 60) // stay well under Android's pending-alarm limits
      .map(({ task, at }) => ({
        id: intId(task.id),
        title: "Gentle reminder 🌿",
        body: `“${task.title}” is due ${formatDeadline(task.deadline)}.`,
        schedule: { at: new Date(at), allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample", // falls back to app icon if absent
      }));

    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
  } catch {
    /* never let a notification hiccup break the app */
  }
}
