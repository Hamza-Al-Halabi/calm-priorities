/* ------------------------------------------------------------------
   storage.js — the ONLY place the app touches persistence.

   Two layers:
   · localStorage   — instant, works offline, always written.
   · the PC server  — (desktop .exe) a copy in state.json next to the
                      exe, so your data survives clearing the browser,
                      switching browsers, and feeds the 7:00 email.
   Each copy carries an `updatedAt` stamp; on startup the newer wins.

   A task looks like:
   {
     id: string,            // crypto.randomUUID()
     title: string,
     description: string,
     deadline: string|null, // ISO datetime
     priority: "high" | "medium" | "low",
     plannedFor: string|null, // "YYYY-MM-DD" — the day you plan to do it
     done: boolean,
     completedAt: string|null, // ISO datetime, set when ticked off
     notified: boolean,     // browser reminder already shown
     createdAt: string      // ISO datetime
   }
   ------------------------------------------------------------------ */

import { apiBase } from "./sync.js";

const TASKS_KEY = "calm-priorities:tasks:v1";
const SETTINGS_KEY = "calm-priorities:settings:v1";
const STAMP_KEY = "calm-priorities:updatedAt:v1";

export const defaultSettings = {
  name: "",
  email: "",
  emailReminders: false, // email me shortly before a deadline
  browserReminders: false, // show browser notifications while the app is open
  leadMinutes: 60, // remind me this many minutes before a deadline
  morningEmail: true, // daily briefing email (desktop app)
  digestTime: "07:00", // when to send it
  weekStart: 1, // 0 = Sunday … 6 = Saturday
  weeklyGoal: 10, // tasks I want to finish each week
};

export function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return []; // corrupted or unavailable storage — start fresh, never crash
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    /* storage full or blocked — the app keeps working in memory */
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/* ---------- change stamp (which copy is newer?) ---------- */

export function loadStamp() {
  try {
    const n = Number(localStorage.getItem(STAMP_KEY));
    if (n) return n;
    // Data from before stamps existed counts as "something" (1), so it
    // beats an empty server instead of being overwritten by it.
    return localStorage.getItem(TASKS_KEY) ? 1 : 0;
  } catch {
    return 0;
  }
}

export function saveStamp(stamp) {
  try {
    localStorage.setItem(STAMP_KEY, String(stamp));
  } catch {
    /* ignore */
  }
}

/* ---------- the PC copy (desktop build only) ---------- */

export const serverStorage = apiBase !== null;

/** → { tasks, settings, updatedAt } or null when there's no server / it's unreachable. */
export async function pullServerState() {
  if (!serverStorage) return null;
  try {
    const r = await fetch(`${apiBase}/api/state`);
    if (!r.ok) return null;
    const s = await r.json();
    return s && Array.isArray(s.tasks) ? s : { tasks: [], settings: null, updatedAt: 0 };
  } catch {
    return null;
  }
}

export async function pushServerState(tasks, settings, updatedAt) {
  if (!serverStorage) return false;
  try {
    const r = await fetch(`${apiBase}/api/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks, settings, updatedAt }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
