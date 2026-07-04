# Calm Priorities 🌿

A quiet place to organize what matters — three priority boxes, gentle deadline tracking, and reminders that never shout.

- **Frontend**: React + Vite + Tailwind CSS v4, tasks stored in `localStorage`
- **Backend** (optional, only for email reminders): Node.js + Express + Resend

```
calm-priorities/
├── frontend/
│   ├── index.html                  fonts, favicon, mount point
│   ├── vite.config.js              Vite + React + Tailwind plugins
│   ├── .env.example                VITE_API_URL (reminder server)
│   └── src/
│       ├── main.jsx                React entry
│       ├── index.css               all design tokens (colors, fonts, shadows)
│       ├── App.jsx                 state, persistence, reminder loop, layout
│       ├── lib/
│       │   ├── storage.js          localStorage today → swap for API/DB later
│       │   ├── deadlines.js        overdue / due-soon logic + formatting
│       │   ├── notifications.js    browser notifications
│       │   ├── sync.js             pushes tasks to the reminder server
│       │   └── tones.js            visual identity of each priority
│       └── components/
│           ├── Header.jsx          app name + "Reminders" + "Add task"
│           ├── CheckInCard.jsx     progress summary ("5 of 12 completed")
│           ├── UpNext.jsx          upcoming deadlines strip
│           ├── PriorityColumn.jsx  one priority box
│           ├── TaskCard.jsx        checkbox, badges, edit/delete
│           ├── TaskFormModal.jsx   add + edit form
│           ├── RemindersModal.jsx  browser + email reminder settings
│           └── Modal.jsx           shared dialog shell
└── server/
    ├── server.js                   sync endpoint + cron + Resend (fully commented)
    ├── store.js                    JSON-file store → swap for a real DB later
    └── .env.example                RESEND_API_KEY, FROM_EMAIL, FRONTEND_ORIGIN
```

---

## 1 · Run locally

**Frontend** (this is the whole app — the server is only needed for email):

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

**Reminder server** (optional):

```bash
cd server
npm install
cp .env.example .env        # paste your Resend API key into .env
npm run dev                 # → http://localhost:3001
```

Then point the frontend at it: `cp frontend/.env.example frontend/.env`, set
`VITE_API_URL=http://localhost:3001`, and restart `npm run dev`.

---

## 2 · How data is stored (and the database upgrade path)

Every read/write goes through **`frontend/src/lib/storage.js`** — nothing else touches persistence. Today those four functions use `localStorage`, which means:

- tasks live on the device/browser they were created on;
- to go multi-device later, replace those four functions with API calls (`fetch('/api/tasks')`) and add matching routes to the server. No component changes needed.

The server mirrors the same idea: **`server/store.js`** is a JSON file behind three functions (`getUser` / `putUser` / `allUsers`). Swap that one file for Postgres/Supabase/Mongo when you outgrow it.

---

## 3 · Browser notifications

Open **Reminders** (bell button) → **Turn on browser reminders** → allow the permission prompt. Pick a lead time (15 min – 1 day). While the app is open in a tab, it checks every 30 seconds and shows one gentle notification per task entering its window (`lib/notifications.js`).

**Honest limitation:** plain browser notifications only fire while the tab is open. Notifying a *closed* app needs a service worker + push server — that gap is exactly what email reminders cover.

---

## 4 · Email reminders (Resend)

How it works end-to-end (also documented in `server/server.js`):

1. The app syncs `{ email, leadMinutes, tasks }` to the server whenever tasks change.
2. Every 5 minutes the server looks for tasks entering their reminder window.
3. Each one triggers one email through Resend's API, then is marked so it never repeats.

Setup (~5 minutes):

1. Create a free account at **resend.com** → **API Keys** → create key.
2. Put it in `server/.env` as `RESEND_API_KEY` (locally) or in Render's env vars (deployed).
3. Leave `FROM_EMAIL=onboarding@resend.dev` for testing. ⚠️ With the test sender, **Resend only delivers to the email address you signed up with** — use that address in the app while testing.
4. To email any address from your own name, verify a domain in Resend (**Domains → Add**, add the DNS records they show), then set `FROM_EMAIL=reminders@yourdomain.com`.
5. In the app: **Reminders → enter your email → check "Email me before deadlines" → Save**.

Quick test: create a task due in ~30 minutes with a 1-hour lead time, then open
`http://localhost:3001/api/check-reminders` — it should respond `{"ok":true,"sent":1}`.

---

## 5 · Deploy online

### Frontend → Vercel (or Netlify)

1. Push this folder to a GitHub repo.
2. **vercel.com → Add New → Project → import the repo.**
3. Set **Root Directory** = `frontend`. Vercel auto-detects Vite (build `npm run build`, output `dist`).
4. Add env var `VITE_API_URL` = your Render server URL (add it after step below, then redeploy).
5. Deploy → you get `https://your-app.vercel.app`.

*Netlify is identical: Base directory `frontend`, build `npm run build`, publish `frontend/dist`.*

### Backend → Render

1. **render.com → New → Web Service → same repo.**
2. **Root Directory** = `server`, Build = `npm install`, Start = `npm start`.
3. Env vars: `RESEND_API_KEY`, `FROM_EMAIL`, `FRONTEND_ORIGIN=https://your-app.vercel.app`.
4. Deploy → you get `https://your-service.onrender.com`. Put that in Vercel's `VITE_API_URL` and redeploy the frontend.

**Free-tier caveat + fix:** Render's free tier sleeps after ~15 min of inactivity, and the internal cron sleeps with it. Fix in 2 minutes: create a free monitor at **cron-job.org** (or UptimeRobot) that requests
`https://your-service.onrender.com/api/check-reminders` **every 10 minutes**. The ping wakes the server *and* runs the reminder check — fully reliable at $0. (Also note `server/store.js`: the free tier's disk is ephemeral, fine for reminders, solved permanently by a real DB.)

---

## 6 · Ideas for later

Accounts + a real database (Supabase pairs well with the existing abstraction) · service-worker push notifications · recurring tasks · drag-and-drop between priorities · a weekly review email.

---

## 7 · Windows desktop (.exe)

`desktop/` compiles the whole app — frontend embedded + reminder engine — into one `CalmPriorities.exe` (Bun, zero dependencies). Settings live in an editable `config.json` next to the exe (the key is never baked into the binary). Rebuild it with [Bun](https://bun.sh) installed:

```bash
cd desktop
npm run build:frontend   # builds ../frontend into desktop/dist (stable names)
npm run build:exe        # → CalmPriorities.exe (cross-compiles from any OS)
```

---

## 8 · Android app (.apk)

`frontend/android/` is a full Capacitor project with **native device notifications** — on the phone, reminders are real Android notifications scheduled at (deadline − lead time), delivered on time even with the app closed.

The APK is built for you by GitHub Actions (`.github/workflows/android-apk.yml`) — no Android Studio needed:

1. Push this repo to GitHub (`main` branch).
2. Repo → **Actions** → *Build Android APK* runs automatically (or click **Run workflow**).
3. When green (~4 min), open the run → **Artifacts** → download **CalmPriorities-apk** → extract `app-debug.apk`.
4. Send it to your phone, tap it, allow *Install unknown apps* for your browser/file manager once.

Email reminders on mobile: deploy `server/` to Render (section 5), then add repo **Variable** `VITE_API_URL` = your Render URL and re-run the workflow. Without it the app is fully local. To rebuild the Android shell locally instead: `cd frontend && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug` (needs Android SDK).
