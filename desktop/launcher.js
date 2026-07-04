/* ==================================================================
   Calm Priorities — Windows desktop launcher (Bun)

   Compiled into CalmPriorities.exe with `bun build --compile`.
   One small process, zero dependencies:
   · serves the frontend (the three dist files are EMBEDDED in the exe)
   · runs the email-reminder API + a 5-minute check (Resend)
   · opens your browser at http://localhost:<port>

   Editable files live NEXT TO the exe (the exe itself is read-only):
   · config.json — port, Resend API key, sender, your email
   · data.json   — synced tasks + "already reminded" flags

   The API key is deliberately NOT baked into the exe binary, so the
   exe can be shared without leaking credentials.
   ================================================================== */

import fs from "node:fs";
import { dirname, join } from "node:path";

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

/* ---------- config ---------- */
const DEFAULT_CONFIG = {
  port: 5173,
  resendApiKey: "", // the shipped config.json carries the real key
  fromEmail: "onboarding@resend.dev",
  defaultEmail: "",
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
const writeAll = (d) => fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
const getUser = (email) => readAll()[email] ?? null;
const putUser = (u) => {
  const all = readAll();
  all[u.email] = u;
  writeAll(all);
};
const allUsers = () => Object.values(readAll());

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------- email via Resend (same logic as server/server.js) ---------- */
async function sendEmail(to, task) {
  const when = new Date(task.deadline).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Calm Priorities <${config.fromEmail}>`,
      to: [to],
      subject: `Gentle reminder: “${task.title}”`,
      text: `Hi,\n\nJust a calm nudge — “${task.title}” is due ${when}.\n\nOne thing at a time.\nCalm Priorities 🌿`,
    }),
  });
  if (!response.ok) console.error("Resend error", response.status, await response.text());
  return response.ok;
}

async function checkReminders(now = new Date()) {
  if (!config.resendApiKey) return 0;
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
      if (pathname === "/api/check-reminders") return json({ ok: true, sent: await checkReminders() });
      return new Response(Bun.file(FILES[pathname] ?? indexHtml));
    },
  });

  console.log("");
  console.log("  🌿 Calm Priorities is running →", url);
  console.log("  Keep this window open (minimized is fine) so email reminders can send.");
  console.log("  Settings: config.json, next to the exe.");
  console.log("");
  if (process.platform === "win32") Bun.spawn(["cmd", "/c", "start", "", url]);
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
