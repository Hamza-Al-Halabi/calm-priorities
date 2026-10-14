/* ------------------------------------------------------------------
   App.jsx — the single source of truth.

   · tasks/settings live in React state and are saved two ways:
     localStorage (instant) and, in the desktop app, state.json on your
     PC (lib/storage). The copy with the newer stamp wins on startup.
   · views: Today (daily plan) · Week (progress dashboard) · Board
   · a 30s loop fires browser reminders (lib/notifications).
   · a debounced effect keeps the reminder server in step (lib/sync).
   ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import TodayView from "./components/TodayView.jsx";
import WeekView from "./components/WeekView.jsx";
import BoardView from "./components/BoardView.jsx";
import Confetti from "./components/Confetti.jsx";
import TaskFormModal from "./components/TaskFormModal.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import {
  loadTasks,
  saveTasks,
  loadSettings,
  saveSettings,
  loadStamp,
  saveStamp,
  defaultSettings,
  serverStorage,
  pullServerState,
  pushServerState,
} from "./lib/storage.js";
import {
  notificationsSupported,
  dueForBrowserReminder,
  showTaskNotification,
} from "./lib/notifications.js";
import { syncToServer, serverConfigured, apiBase } from "./lib/sync.js";
import { isNativeApp, ensureNativePermission, rescheduleAll } from "./lib/mobileNotifications.js";
import { dayKey, todayPlan } from "./lib/stats.js";

const VIEW_KEY = "calm-priorities:view";
const loadView = () => {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "week" || v === "board" ? v : "today";
  } catch {
    return "today";
  }
};

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [settings, setSettings] = useState(loadSettings);
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState(loadView);
  const [form, setForm] = useState({ open: false, task: null, defaultPriority: "medium", plan: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(!serverStorage); // PC copy checked?
  const [burst, setBurst] = useState(0);

  /* Which copy of the data is newer: bumped on every user change. */
  const stampRef = useRef(loadStamp());
  const touch = () => {
    stampRef.current = Date.now();
  };
  const updateTasks = (fn) => {
    touch();
    setTasks(fn);
  };
  const updateSettings = (next) => {
    touch();
    setSettings(next);
  };

  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  /* ---------- persistence ---------- */
  useEffect(() => {
    saveTasks(tasks);
    saveStamp(stampRef.current);
  }, [tasks]);
  useEffect(() => {
    saveSettings(settings);
    saveStamp(stampRef.current);
  }, [settings]);

  /* Desktop app: adopt the PC copy if it's newer than this browser's. */
  useEffect(() => {
    if (!serverStorage) return;
    let cancelled = false;
    pullServerState().then((s) => {
      if (cancelled) return;
      if (s && s.updatedAt > stampRef.current) {
        stampRef.current = s.updatedAt;
        setTasks(s.tasks);
        if (s.settings) setSettings({ ...defaultSettings, ...s.settings });
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* …and keep the PC copy current (debounced). The server ignores stale stamps. */
  useEffect(() => {
    if (!ready || !serverStorage) return;
    const id = setTimeout(() => pushServerState(tasks, settings, stampRef.current), 800);
    return () => clearTimeout(id);
  }, [tasks, settings, ready]);

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

  /* ---------- Android app: device notifications, even when closed ---------- */
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

  /* ---------- confetti when today's plan becomes fully done ---------- */
  const plan = todayPlan(tasks, now);
  const allDone = plan.total > 0 && plan.done === plan.total;
  const wasAllDone = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasAllDone.current) setBurst((b) => b + 1);
    wasAllDone.current = allDone;
  }, [allDone]);

  /* ---------- task actions ---------- */
  const patch = (id, fn) => updateTasks((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  function upsertTask(data, existingId) {
    if (existingId) {
      patch(existingId, (t) => ({
        ...t,
        ...data,
        // if the deadline moved, allow a fresh browser reminder
        notified: data.deadline !== t.deadline ? false : t.notified,
      }));
    } else {
      updateTasks((ts) => [
        ...ts,
        {
          id: crypto.randomUUID(),
          done: false,
          completedAt: null,
          notified: false,
          createdAt: new Date().toISOString(),
          ...data,
        },
      ]);
    }
  }

  const toggleDone = (id) =>
    patch(id, (t) => ({
      ...t,
      done: !t.done,
      completedAt: t.done ? null : new Date().toISOString(),
    }));
  const deleteTask = (id) => updateTasks((ts) => ts.filter((t) => t.id !== id));
  const movePriority = (id, priority) => patch(id, (t) => ({ ...t, priority }));

  const today = () => dayKey(new Date());
  const planTask = (id) => patch(id, (t) => ({ ...t, plannedFor: today() }));
  const unplanTask = (id) => patch(id, (t) => ({ ...t, plannedFor: null }));
  const togglePlan = (id) =>
    patch(id, (t) => ({ ...t, plannedFor: t.plannedFor === today() ? null : today() }));
  const planMany = (ids) => {
    const set = new Set(ids);
    updateTasks((ts) => ts.map((t) => (set.has(t.id) ? { ...t, plannedFor: today() } : t)));
  };
  const quickAdd = (title, priority) =>
    upsertTask({ title, description: "", deadline: null, priority, plannedFor: today() });

  const openAdd = (priority = "medium", plan = false) =>
    setForm({ open: true, task: null, defaultPriority: priority, plan });
  const openEdit = (task) =>
    setForm({ open: true, task, defaultPriority: task.priority, plan: false });

  /* ---------- layout ---------- */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Header
        view={view}
        onView={changeView}
        onAddTask={() => openAdd("medium", view === "today")}
        onOpenSettings={() => setSettingsOpen(true)}
        remindersOn={settings.browserReminders || settings.emailReminders || settings.morningEmail}
      />

      {view === "today" && (
        <TodayView
          tasks={tasks}
          settings={settings}
          now={now}
          onToggle={toggleDone}
          onEdit={openEdit}
          onUnplan={unplanTask}
          onPlan={planTask}
          onPlanMany={planMany}
          onQuickAdd={quickAdd}
          onOpenWeek={() => changeView("week")}
        />
      )}

      {view === "week" && (
        <WeekView
          tasks={tasks}
          settings={settings}
          now={now}
          onSetGoal={(n) => updateSettings({ ...settings, weeklyGoal: n })}
          onPlan={planTask}
          onEdit={openEdit}
        />
      )}

      {view === "board" && (
        <BoardView
          tasks={tasks}
          now={now}
          todayKey={dayKey(now)}
          handlers={{
            onAdd: openAdd,
            onEdit: openEdit,
            onDelete: deleteTask,
            onToggle: toggleDone,
            onTogglePlan: togglePlan,
            onMove: movePriority,
          }}
        />
      )}

      <footer className="mt-10 text-center text-xs text-ink-400">
        {serverStorage
          ? "Your tasks are saved on this PC."
          : "Your tasks stay on this device — unless you turn on email reminders, nothing leaves your browser."}
      </footer>

      <Confetti burst={burst} />

      <TaskFormModal
        open={form.open}
        initial={form.task}
        defaultPriority={form.defaultPriority}
        defaultPlanToday={form.plan}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSave={upsertTask}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        tasks={tasks}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
      />
    </div>
  );
}
