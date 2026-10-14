/* ==================================================================
   Calm Priorities — reminder server

   WHY THIS EXISTS
   A browser can only notify you while the tab is open. Email reminders
   need something that's awake when your deadline approaches — that's
   this small Express server.

   HOW EMAIL REMINDERS WORK (the whole flow)
   1. SYNC   The app POSTs { email, leadMinutes, tasks } to /api/sync
             whenever your tasks change (see frontend/src/lib/sync.js).
             Only unfinished tasks with a deadline are sent: id, title,
             deadline. The server stores them per email address.
   2. CHECK  checkReminders() runs every 5 minutes. For every stored
             user it looks for tasks whose deadline is within
             `leadMinutes` from now and that haven't been emailed yet.
   3. SEND   For each of those it calls the Resend API
             (POST https://api.resend.com/emails with your API key)
             and records the task id in `reminded`, so every task is
             emailed exactly once.

   SCHEDULING — two layers, on purpose
   · node-cron fires the check every 5 minutes while the process runs.
   · GET /api/check-reminders runs the same check on demand. On
     Render's FREE tier the server sleeps after ~15 min of no traffic
     (and node-cron sleeps with it). Fix: point a free ping service
     (cron-job.org or UptimeRobot) at /api/check-reminders every
     10 minutes — the ping wakes the server AND runs the check, so
     reminders stay reliable at $0.

   ENVIRONMENT VARIABLES (see .env.example)
   · RESEND_API_KEY   from https://resend.com (free tier is enough)
   · FROM_EMAIL       "onboarding@resend.dev" for testing; your own
                      address once you verify a domain in Resend
   · FRONTEND_ORIGIN  your deployed app URL, to lock down CORS
   · PORT             optional, defaults to 3001

   SWAPPING EMAIL PROVIDERS
   Only sendEmail() below talks to Resend. To use Nodemailer/SendGrid
   instead, replace that one function.
   ================================================================== */

import express from "express";
import cors from "cors";
import cron from "node-cron";
import nodemailer from "nodemailer";
import { getUser, putUser, allUsers, getState, putState, getMeta, putMeta } from "./store.js";
import { buildDigest } from "./digest.js";
import { dayKey } from "./stats.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
// Gmail option: SMTP_PASS is a Google "App password".
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const DEFAULT_EMAIL = process.env.DEFAULT_EMAIL || "";
// Shared secret between the desktop app and this server (protects your tasks).
const SYNC_TOKEN = process.env.SYNC_TOKEN || "";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------- health check (also a handy wake-up target) ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- 1. SYNC: the app pushes its current tasks ---------- */
app.post("/api/sync", (req, res) => {
  const { email, leadMinutes = 60, tasks = [] } = req.body ?? {};

  if (!EMAIL_RE.test(email ?? "")) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (!Array.isArray(tasks) || tasks.length > 500) {
    return res.status(400).json({ error: "Task list missing or too large." });
  }

  // Keep "already reminded" flags for tasks that still exist,
  // so re-syncing never causes duplicate emails.
  const existing = getUser(email);
  const reminded = {};
  for (const t of tasks) {
    if (existing?.reminded?.[t.id]) reminded[t.id] = true;
  }

  putUser({
    email,
    leadMinutes: Number(leadMinutes) || 60,
    tasks: tasks.map((t) => ({
      id: String(t.id),
      title: String(t.title ?? "Untitled").slice(0, 200),
      deadline: t.deadline,
    })),
    reminded,
    updatedAt: new Date().toISOString(),
  });

  res.json({ ok: true, stored: tasks.length });
});

/* ---------- 3. SEND: one email via Gmail (SMTP) or Resend ---------- */
const smtp =
  SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

/** → { ok, error? } — never throws. */
async function sendMail({ to, subject, text, html }) {
  try {
    if (smtp) {
      await smtp.sendMail({ from: `Calm Priorities <${SMTP_USER}>`, to, subject, text, html });
      return { ok: true };
    }
    if (!RESEND_API_KEY) return { ok: false, error: "No email provider configured." };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Calm Priorities <${FROM_EMAIL}>`, to: [to], subject, text, html }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Resend error", response.status, body);
      return { ok: false, error: `Resend refused it (${response.status}).` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Email error", err);
    return { ok: false, error: String(err?.message || err).slice(0, 200) };
  }
}

async function sendEmail(to, task) {
  const when = new Date(task.deadline).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const r = await sendMail({
    to,
    subject: `Gentle reminder: “${task.title}”`,
    text: `Hi,

Just a calm nudge — “${task.title}” is due ${when}.

One thing at a time.
Calm Priorities 🌿`,
  });
  return r.ok;
}

/* ---------- 2. CHECK: find tasks entering their reminder window ---------- */
async function checkReminders(now = new Date()) {
  if (!RESEND_API_KEY && !smtp) return 0;

  let sent = 0;
  for (const user of allUsers()) {
    const lead = (user.leadMinutes || 60) * 60 * 1000;
    user.reminded = user.reminded || {};
    let changed = false;

    for (const task of user.tasks || []) {
      if (!task.deadline || user.reminded[task.id]) continue;
      const diff = new Date(task.deadline) - now;

      // Inside the reminder window, or missed by <10 min (e.g. the
      // server was asleep) — never for tasks long past due.
      if (diff <= lead && diff > -10 * 60 * 1000) {
        if (await sendEmail(user.email, task)) {
          user.reminded[task.id] = true;
          changed = true;
          sent += 1;
        }
      }
    }
    if (changed) putUser(user);
  }

  if (sent > 0) console.log(`Sent ${sent} reminder email(s).`);
  return sent;
}

/* ---------- full app state, pushed by the desktop app ---------- */

/** Only the desktop app (which knows SYNC_TOKEN) may read or write your tasks. */
function requireToken(req, res, next) {
  if (!SYNC_TOKEN || req.get("authorization") !== `Bearer ${SYNC_TOKEN}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized." });
  }
  next();
}

app.get("/api/state", requireToken, (_req, res) => res.json(getState()));

app.put("/api/state", requireToken, (req, res) => {
  const { tasks, settings, updatedAt } = req.body ?? {};
  if (!Array.isArray(tasks) || tasks.length > 5000) return res.status(400).json({ error: "Bad task list." });
  if (Number(updatedAt) < Number(getState().updatedAt || 0)) return res.status(409).json({ ok: false, stale: true });
  putState({ tasks, settings: settings ?? null, updatedAt: Number(updatedAt) || Date.now() });
  res.json({ ok: true });
});

/* ---------- morning briefing ---------- */

/** Once per day at/after the chosen time, up to 3 hours late (e.g. after a restart). */
async function checkDigest(now = new Date()) {
  const { tasks, settings } = getState();
  if (!settings || settings.morningEmail === false || !tasks?.length) return;
  // The server runs in UTC; use YOUR timezone (sent by the desktop app).
  if (settings.tz && process.env.TZ !== settings.tz) {
    process.env.TZ = settings.tz;
    now = new Date();
  }
  const to = settings.email || DEFAULT_EMAIL;
  if (!EMAIL_RE.test(to ?? "")) return;

  const [h, m] = String(settings.digestTime || "07:00").split(":").map(Number);
  const at = new Date(now);
  at.setHours(h || 0, m || 0, 0, 0);
  const meta = getMeta();
  if (meta.lastDigest === dayKey(now)) return;
  if (now < at || now - at > 3 * 60 * 60 * 1000) return;

  const { subject, html, text } = buildDigest(tasks, settings, now, "");
  const r = await sendMail({ to, subject, html, text });
  if (r.ok) {
    putMeta({ ...meta, lastDigest: dayKey(now) });
    console.log(`Sent the morning briefing to ${to}.`);
  } else {
    console.error("Morning briefing failed:", r.error);
  }
}


/* On-demand check — the target for cron-job.org / UptimeRobot pings. */
app.get("/api/check-reminders", async (_req, res) => {
  try {
    const sent = await checkReminders();
    res.json({ ok: true, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* Automatic check every 5 minutes while the process is awake. */
cron.schedule("*/5 * * * *", () => checkReminders().catch(console.error));
cron.schedule("* * * * *", () => checkDigest().catch(console.error));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Calm Priorities reminder server on :${PORT}`));
