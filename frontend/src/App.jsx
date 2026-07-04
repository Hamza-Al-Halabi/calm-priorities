/* ------------------------------------------------------------------
   App.jsx — the single source of truth.

   · tasks/settings live in React state, persisted through lib/storage
     (localStorage today, database-ready later).
   · a 30s loop fires browser reminders (lib/notifications).
   · a debounced effect syncs tasks to the email reminder server
     (lib/sync) whenever something changes.
   ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import CheckInCard from "./components/CheckInCard.jsx";
import UpNext from "./components/UpNext.jsx";
import PriorityColumn from "./components/PriorityColumn.jsx";
import TaskFormModal from "./components/TaskFormModal.jsx";
import RemindersModal from "./components/RemindersModal.jsx";
import { loadTasks, saveTasks, loadSettings, saveSettings } from "./lib/storage.js";
import {
  notificationsSupported,
  dueForBrowserReminder,
  showTaskNotification,
} from "./lib/notifications.js";
import { syncToServer, serverConfigured, apiBase } from "./lib/sync.js";
import { isNativeApp, ensureNativePermission, rescheduleAll } from "./lib/mobileNotifications.js";
import { PRIORITIES } from "./lib/tones.js";

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [settings, setSettings] = useState(loadSettings);
  const [now, setNow] = useState(() => new Date());
  const [form, setForm] = useState({ open: false, task: null, defaultPriority: "medium" });
  const [remindersOpen, setRemindersOpen] = useState(false);

  /* ---------- persistence ---------- */
  useEffect(() => saveTasks(tasks), [tasks]);
  useEffect(() => saveSettings(settings), [settings]);

  /* ---------- keep deadline badges fresh (re-render each minute) ---------- */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- browser reminders: check every 30s while the app is open ---------- */
  useEffect(() => {
    if (!settings.browserReminders) return;
    const check = () => {
      if (!notificationsSupported() || Notification.permission !== "granted") return;
      setTasks((prev) => {
        const due = dueForBrowserReminder(prev, settings.leadMinutes);
        if (due.length === 0) return prev;
        due.forEach(showTaskNotification);
        const ids = new Set(due.map((t) => t.id));
        return prev.map((t) => (ids.has(t.id) ? { ...t, notified: true } : t));
      });
    };
    check();
    const id = setInterval(check, 30 * 1000);
    return () => clearInterval(id);
  }, [settings.browserReminders, settings.leadMinutes]);

  /* ---------- desktop build: prefill your email from the launcher's config.json ---------- */
  useEffect(() => {
    if (!serverConfigured) return;
    fetch(`${apiBase}/api/default-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cfg?.email) return;
        setSettings((s) => (s.email ? s : { ...s, email: cfg.email, emailReminders: true }));
      })
      .catch(() => {}); // web deploys just 404 here — harmless
  }, []);

  /* ---------- Android app: ask notification permission once, then keep
     device notifications in sync with tasks (fires even when app is closed) ---------- */
  useEffect(() => {
    if (isNativeApp) ensureNativePermission();
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;
    const id = setTimeout(() => rescheduleAll(tasks, settings.leadMinutes), 1000);
    return () => clearTimeout(id);
  }, [tasks, settings.leadMinutes]);

  /* ---------- sync to the email reminder server (debounced 1.5s) ---------- */
  useEffect(() => {
    const id = setTimeout(() => syncToServer(tasks, settings), 1500);
    return () => clearTimeout(id);
  }, [tasks, settings]);

  /* ---------- task actions ---------- */
  function upsertTask(data, existingId) {
    if (existingId) {
      setTasks((ts) =>
        ts.map((t) =>
          t.id === existingId
            ? {
                ...t,
                ...data,
                // if the deadline moved, allow a fresh browser reminder
                notified: data.deadline !== t.deadline ? false : t.notified,
              }
            : t
        )
      );
    } else {
      setTasks((ts) => [
        ...ts,
        {
          id: crypto.randomUUID(),
          done: false,
          notified: false,
          createdAt: new Date().toISOString(),
          ...data,
        },
      ]);
    }
  }

  const toggleDone = (id) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const deleteTask = (id) => setTasks((ts) => ts.filter((t) => t.id !== id));
  const openAdd = (priority = "medium") => setForm({ open: true, task: null, defaultPriority: priority });
  const openEdit = (task) => setForm({ open: true, task, defaultPriority: task.priority });

  /* ---------- derived values ---------- */
  const doneCount = tasks.filter((t) => t.done).length;

  const byPriority = useMemo(() => {
    const groups = { high: [], medium: [], low: [] };
    for (const t of tasks) (groups[t.priority] ?? groups.medium).push(t);
    return groups;
  }, [tasks]);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.deadline && !t.done)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 4),
    [tasks]
  );

  /* ---------- layout ---------- */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Header
        onAddTask={() => openAdd("medium")}
        onOpenReminders={() => setRemindersOpen(true)}
        remindersOn={settings.browserReminders || settings.emailReminders}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <CheckInCard done={doneCount} total={tasks.length} />
        <UpNext tasks={upcoming} now={now} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        {PRIORITIES.map((p) => (
          <PriorityColumn
            key={p}
            priority={p}
            tasks={byPriority[p]}
            now={now}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={deleteTask}
            onToggle={toggleDone}
          />
        ))}
      </div>

      <footer className="mt-10 text-center text-xs text-ink-400">
        Your tasks stay on this device — unless you turn on email reminders, nothing leaves your
        browser.
      </footer>

      <TaskFormModal
        open={form.open}
        initial={form.task}
        defaultPriority={form.defaultPriority}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSave={upsertTask}
      />

      <RemindersModal
        open={remindersOpen}
        settings={settings}
        onClose={() => setRemindersOpen(false)}
        onSave={setSettings}
      />
    </div>
  );
}
