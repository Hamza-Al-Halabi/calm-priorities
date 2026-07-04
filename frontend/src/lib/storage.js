/* ------------------------------------------------------------------
   storage.js — the ONLY place the app touches persistence.

   Today it uses localStorage, so everything stays on this device.
   To connect a database later, replace the four functions below with
   API calls (e.g. fetch(`${API_URL}/api/tasks`)) — no component or
   other file needs to change, because everything goes through here.

   A task looks like:
   {
     id: string,            // crypto.randomUUID()
     title: string,
     description: string,
     deadline: string|null, // ISO datetime, e.g. "2026-07-10T14:30:00.000Z"
     priority: "high" | "medium" | "low",
     done: boolean,
     notified: boolean,     // browser reminder already shown for this task
     createdAt: string      // ISO datetime
   }
   ------------------------------------------------------------------ */

const TASKS_KEY = "calm-priorities:tasks:v1";
const SETTINGS_KEY = "calm-priorities:settings:v1";

export const defaultSettings = {
  email: "",
  emailReminders: false, // sync tasks to the reminder server + get emails
  browserReminders: false, // show browser notifications while the app is open
  leadMinutes: 60, // remind me this many minutes before a deadline
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
