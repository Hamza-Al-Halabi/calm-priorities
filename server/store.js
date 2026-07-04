/* ------------------------------------------------------------------
   store.js — the server's persistence layer, kept deliberately tiny.

   Data lives in one JSON file (data.json) shaped like:
   {
     "you@example.com": {
       "email": "you@example.com",
       "leadMinutes": 60,
       "tasks": [{ "id", "title", "deadline" }],
       "reminded": { "<taskId>": true },   // emails already sent
       "updatedAt": "2026-07-04T…"
     }
   }

   UPGRADE PATH: to move to a real database (Postgres, Supabase,
   MongoDB…), reimplement these three functions — server.js only ever
   calls getUser / putUser / allUsers.

   NOTE for Render's free tier: the filesystem is ephemeral, so
   data.json resets on redeploys/restarts. That's acceptable here —
   the app re-syncs your tasks the next time you open it — but a real
   database removes the caveat entirely.
   ------------------------------------------------------------------ */

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "data.json");

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function getUser(email) {
  return readAll()[email] ?? null;
}

export function putUser(user) {
  const all = readAll();
  all[user.email] = user;
  writeAll(all);
}

export function allUsers() {
  return Object.values(readAll());
}
