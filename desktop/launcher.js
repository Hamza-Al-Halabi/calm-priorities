/* ==================================================================
   Calm Priorities — Windows desktop launcher (Bun)

   Compiled into CalmPriorities.exe with `bun build --compile`.
   One small process, zero dependencies:
   · serves the frontend (the three dist files are EMBEDDED in the exe)
   · saves ALL your tasks + settings to state.json on this PC
   · emails you a morning briefing (default 07:00) and deadline reminders
   · opens your browser at http://localhost:<port>  (skipped with --background)

   Editable files live NEXT TO the exe (the exe itself is read-only):
   · config.json — port, email sending (Gmail app password or Resend), default email
   · state.json  — your tasks + settings (the app's real database)
   · data.json   — "already reminded" flags for deadline emails
   · meta.json   — when the last morning briefing went out

   The API key is deliberately NOT baked into the exe binary, so the
   exe can be shared without leaking credentials.
   ================================================================== */

import fs from "node:fs";
import { dirname, join } from "node:path";
import nodemailer from "nodemailer";
import { buildDigest } from "./digest.js";
import { dayKey } from "../frontend/src/lib/stats.js";

/* Frontend files, embedded into the compiled binary. */
import indexHtml from "./dist/index.html" with { type: "file" };
import appJs from "./dist/assets/app.js" with { type: "file" };
import appCss from "./dist/assets/app.css" with { type: "file" };

/* ---------- paths: writable files sit beside the exe ---------- */
const compiled =
  import.meta.path.includes("$bunfs") || import.meta.path.includes("~BUN");
const baseDir = compiled ? dirname(process.execPath) : import.meta.dir;
const CONFIG_FILE = join(baseDir, "config.json");
const DATA_FILE = join(baseDir, "data.json");
const STATE_FILE = join(baseDir, "state.json");
const META_FILE = join(baseDir, "meta.json");
const BACKGROUND = process.argv.includes("--background");

/* ---------- config ---------- */
const DEFAULT_CONFIG = {
  port: 5173,
  resendApiKey: "", // the shipped config.json carries the real key
  fromEmail: "onboarding@resend.dev",
  defaultEmail: "",
  // Gmail option (recommended): sends from your own Gmail to any address.
  // smtpPass must be a Google "App password", not your normal password.
  smtpUser: "",
  smtpPass: "",
  smtpHost: "smtp.gmail.com",
  smtpPort: 465,
};

let config = { ...DEFAULT_CONFIG };
try {
  config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) };
} catch {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

/* ---------- tiny JSON store (same shape as server/store.js) ---------- */
const readAll = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
};
/* Write via a temp file + rename, so a crash can never leave half a file. */
const writeJson = (file, data) => {
  fs.writeFileSync(file + ".tmp", JSON.stringify(data, null, 2));
  fs.renameSync(file + ".tmp", file);
};
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};
const writeAll = (d) => writeJson(DATA_FILE, d);
const getUser = (email) => readAll()[email] ?? null;
const putUser = (u) => {
  const all = readAll();
  all[u.email] = u;
  writeAll(all);
};
const allUsers = () => Object.values(readAll());

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------- sending email: Gmail (SMTP) if configured, else Resend ---------- */
let smtp = null;
function transport() {
  if (!config.smtpUser || !config.smtpPass) return null;
  const port = Number(config.smtpPort) || 465;
  smtp ??= nodemailer.createTransport({
    host: config.smtpHost || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  return smtp;
}

/** → { ok, error? } — never throws. */
async function sendMail({ to, subject, text, html }) {
  try {
    const t = transport();
    if (t) {
      await t.sendMail({ from: `Calm Priorities <${config.smtpUser}>`, to, subject, text, html });
      return { ok: true };
    }
    if (!config.resendApiKey)
      return {
        ok: false,
        error: "Email isn't set up yet. Add smtpUser + smtpPass (Gmail app password) to config.json.",
      };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Calm Priorities <${config.fromEmail}>`, to: [to], subject, text, html }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Resend error", response.status, body);
      return { ok: false, error: `Resend refused it (${response.status}). ${body.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Email error", err);
    smtp = null; // rebuild the connection next time
    return { ok: false, error: String(err?.message || err).slice(0, 200) };
  }
}

async function sendEmail(to, task) {
  const when = new Date(task.deadline).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const r = await sendMail({
    to,
    subject: `Gentle reminder: “${task.title}”`,
    text: `Hi,\n\nJust a calm nudge — “${task.title}” is due ${when}.\n\nOne thing at a time.\nCalm Priorities 🌿`,
  });
  return r.ok;
}

async function checkReminders(now = new Date()) {
  if (!config.resendApiKey && !config.smtpUser) return 0;
  let sent = 0;
  for (const user of allUsers()) {
    const lead = (user.leadMinutes || 60) * 60 * 1000;
    user.reminded = user.reminded || {};
    let changed = false;
    for (const task of user.tasks || []) {
      if (!task.deadline || user.reminded[task.id]) continue;
      const diff = new Date(task.deadline) - now;
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

setTimeout(() => checkReminders().catch(console.error), 5000); // shortly after launch
setInterval(() => checkReminders().catch(console.error), 5 * 60 * 1000); // then every 5 min

/* ---------- app state (tasks + settings), saved on this PC ---------- */
const readState = () => readJson(STATE_FILE, { tasks: [], settings: null, updatedAt: 0 });

/* ---------- morning briefing ---------- */
const appUrl = () => `http://localhost:${config.port}`;

async function sendDigest(tasks, settings, to) {
  const { subject, html, text } = buildDigest(tasks, settings, new Date(), appUrl());
  return sendMail({ to, subject, html, text });
}

/** Due once per day: at/after the chosen time, up to 8 hours late (PC was off or asleep). */
async function checkDigest(now = new Date()) {
  const state = readState();
  const settings = state.settings;
  if (!settings || settings.morningEmail === false) return;
  const to = settings.email || config.defaultEmail;
  if (!to || !EMAIL_RE.test(to)) return;

  const [h, m] = String(settings.digestTime || "07:00").split(":").map(Number);
  const at = new Date(now);
  at.setHours(h || 0, m || 0, 0, 0);
  const meta = readJson(META_FILE, {});
  if (meta.lastDigest === dayKey(now)) return;
  if (now < at || now - at > 8 * 60 * 60 * 1000) return;

  const r = await sendDigest(state.tasks || [], settings, to);
  if (r.ok) {
    writeJson(META_FILE, { ...meta, lastDigest: dayKey(now) });
    console.log(`Sent the morning briefing to ${to}.`);
  } else {
    console.error("Morning briefing failed:", r.error); // retried on the next tick
  }
}

setTimeout(() => checkDigest().catch(console.error), 8000);
setInterval(() => checkDigest().catch(console.error), 60 * 1000);

/* ---------- request handlers ---------- */
function json(data, status = 200) {
  return Response.json(data, { status });
}

async function handleSync(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const { email, leadMinutes = 60, tasks = [] } = body ?? {};
  if (!EMAIL_RE.test(email ?? "")) return json({ error: "A valid email is required." }, 400);
  if (!Array.isArray(tasks) || tasks.length > 500)
    return json({ error: "Task list missing or too large." }, 400);

  // Keep "already reminded" flags for tasks that still exist,
  // so re-syncing never causes duplicate emails.
  const existing = getUser(email);
  const reminded = {};
  for (const t of tasks) if (existing?.reminded?.[t.id]) reminded[t.id] = true;

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
  return json({ ok: true, stored: tasks.length });
}

function handleGetState() {
  return json(readState());
}

async function handlePutState(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const { tasks, settings, updatedAt } = body ?? {};
  if (!Array.isArray(tasks) || tasks.length > 5000) return json({ error: "Bad task list." }, 400);
  const stored = readState();
  // Never let an older copy (e.g. an old browser tab) overwrite newer data.
  if (Number(updatedAt) < Number(stored.updatedAt || 0)) return json({ ok: false, stale: true }, 409);
  if (stored.tasks?.length) {
    try {
      fs.copyFileSync(STATE_FILE, STATE_FILE.replace(/\.json$/, ".backup.json"));
    } catch {
      /* first save */
    }
  }
  writeJson(STATE_FILE, {
    tasks,
    settings: settings ?? stored.settings,
    updatedAt: Number(updatedAt) || Date.now(),
  });
  return json({ ok: true });
}

/* "Send a test now" — uses what the app sends, doesn't mark today as sent. */
async function handleSendDigest(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }
  const settings = body?.settings ?? readState().settings ?? {};
  const to = settings.email || config.defaultEmail;
  if (!EMAIL_RE.test(to ?? "")) return json({ ok: false, error: "Enter a valid email first." }, 400);
  const tasks = Array.isArray(body?.tasks) ? body.tasks : readState().tasks;
  const r = await sendDigest(tasks, settings, to);
  return json(r, r.ok ? 200 : 502);
}

/* Embedded static files, by URL path. Anything else falls back to the
   app shell (index.html), which is standard single-page-app routing. */
const FILES = {
  "/": indexHtml,
  "/index.html": indexHtml,
  "/assets/app.js": appJs,
  "/assets/app.css": appCss,
};

/* ---------- start ---------- */
const url = `http://localhost:${config.port}`;
try {
  Bun.serve({
    port: config.port,
    hostname: "localhost", // local-only: no firewall prompt, nothing exposed to the network
    async fetch(req) {
      const { pathname } = new URL(req.url);
      if (pathname === "/api/health") return json({ ok: true });
      if (pathname === "/api/default-config") return json({ email: config.defaultEmail });
      if (pathname === "/api/sync" && req.method === "POST") return handleSync(req);
      if (pathname === "/api/state" && req.method === "GET") return handleGetState();
      if (pathname === "/api/state" && req.method === "PUT") return handlePutState(req);
      if (pathname === "/api/send-digest" && req.method === "POST") return handleSendDigest(req);
      if (pathname === "/api/check-reminders") return json({ ok: true, sent: await checkReminders() });
      return new Response(Bun.file(FILES[pathname] ?? indexHtml));
    },
  });

  console.log("");
  console.log("  🌿 Calm Priorities is running →", url);
  console.log("  Keep this window open (minimized is fine) so emails can send.");
  console.log("  Your tasks are saved in state.json next to the exe.");
  console.log("  Settings: config.json, next to the exe.");
  console.log("");
  if (process.platform === "win32" && !BACKGROUND) Bun.spawn(["cmd", "/c", "start", "", url]);
} catch (err) {
  if (String(err).includes("EADDRINUSE") || err?.code === "EADDRINUSE") {
    console.error(`\n  Port ${config.port} is already in use.`);
    console.error('  Close the other program using it, or change "port" in config.json.');
    console.error("  This window stays open so you can read this message.\n");
    setInterval(() => {}, 1 << 30);
  } else {
    throw err;
  }
}
