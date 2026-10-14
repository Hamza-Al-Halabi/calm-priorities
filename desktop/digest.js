/* ==================================================================
   digest.js — builds the morning briefing email.

   Uses the SAME numbers as the app's Today/Week screens
   (frontend/src/lib/stats.js), so the email never disagrees with
   the dashboard.

   buildDigest(tasks, settings, now, appUrl) → { subject, html, text }
   ================================================================== */

import { dayKey, suggestions, todayPlan, streak, weekRange, weekStats } from "../frontend/src/lib/stats.js";

const RANK = { high: 0, medium: 1, low: 2 };
const DOT = { high: "#cc8b85", medium: "#d9a25f", low: "#7faf8d" };
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const time = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function when(iso, now) {
  const d = new Date(iso);
  const diff = Math.round((new Date(dayKey(d)) - new Date(dayKey(now))) / 86400000);
  const day =
    diff === 0
      ? "today"
      : diff === 1
        ? "tomorrow"
        : diff === -1
          ? "yesterday"
          : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return `${day} ${time(iso)}`;
}

function greeting(name) {
  return name ? `Good morning, ${name}` : "Good morning";
}

export function buildDigest(tasks, settings, now = new Date(), appUrl = "") {
  const range = weekRange(now, settings.weekStart ?? 1, 0);
  const week = weekStats(tasks, range, now);
  const goal = Math.max(1, settings.weeklyGoal || 10);
  const plan = todayPlan(tasks, now);
  const planned = plan.planned
    .filter((t) => !t.done)
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || String(a.deadline ?? "9").localeCompare(String(b.deadline ?? "9")));

  const ideas = suggestions(tasks, now, 5);
  const overdue = tasks
    .filter((t) => !t.done && t.deadline && new Date(t.deadline) < now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  // Yesterday's wins
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yKey = dayKey(y);
  const wins = tasks.filter((t) => t.done && t.completedAt && dayKey(t.completedAt) === yKey);

  const pct = Math.min(100, Math.round((week.completed.length / goal) * 100));
  const days = streak(tasks, now);
  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const openCount = planned.length;
  const subject =
    openCount > 0
      ? `Your day: ${openCount} planned · ${week.completed.length}/${goal} this week`
      : ideas.length > 0
        ? `Plan your day: ${ideas.length} things need you · ${week.completed.length}/${goal} this week`
        : `A clear day · ${week.completed.length}/${goal} this week`;

  /* ---------- plain text ---------- */
  const line = (t, extra = "") => `  • ${t.title} (${PRIORITY_LABEL[t.priority]})${extra}`;
  const text = [
    `${greeting(settings.name)} — ${dateLabel}`,
    "",
    `THIS WEEK: ${week.completed.length} of ${goal} done (${pct}%)${days ? ` · ${days}-day streak` : ""}`,
    "",
    planned.length ? "TODAY'S PLAN" : "TODAY'S PLAN — nothing planned yet. Suggested starting points:",
    ...(planned.length
      ? planned.map((t) => line(t, t.deadline ? ` — due ${when(t.deadline, now)}` : ""))
      : ideas.map((i) => line(i.task, ` — ${i.reason}`))),
    ...(overdue.length ? ["", "OVERDUE", ...overdue.map((t) => line(t, ` — was due ${when(t.deadline, now)}`))] : []),
    ...(wins.length ? ["", `YESTERDAY YOU FINISHED ${wins.length}`, ...wins.map((t) => `  ✓ ${t.title}`)] : []),
    "",
    appUrl ? `Open Calm Priorities: ${appUrl}` : "",
    "One thing at a time.",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  /* ---------- HTML (inline styles only — email clients ignore <style>) ---------- */
  const row = (t, note, noteColor = "#6b7484") => `
    <tr><td style="padding:9px 0;border-bottom:1px solid #f5f1e9;">
      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${DOT[t.priority]};margin-right:10px;"></span>
      <span style="font-weight:700;color:#3d4451;">${esc(t.title)}</span>
      ${note ? `<span style="display:block;margin:2px 0 0 19px;font-size:12px;color:${noteColor};">${esc(note)}</span>` : ""}
    </td></tr>`;

  const section = (title, rows, accent = "#9aa3b2") =>
    rows
      ? `<h2 style="margin:26px 0 6px;font:700 12px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${accent};">${title}</h2>
         <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`
      : "";

  const planRows = planned.map((t) => row(t, t.deadline ? `Due ${when(t.deadline, now)}` : "")).join("");
  const ideaRows = ideas.map((i) => row(i.task, i.reason)).join("");
  const overdueRows = overdue.slice(0, 8).map((t) => row(t, `Was due ${when(t.deadline, now)}`, "#9e5f5a")).join("");
  const winRows = wins
    .map((t) => `<tr><td style="padding:6px 0;color:#4e7a5d;">✓ <span style="color:#3d4451;">${esc(t.title)}</span></td></tr>`)
    .join("");

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#fbf9f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf9f5;"><tr><td align="center" style="padding:28px 14px;">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #eae4d7;border-radius:24px;">
      <tr><td style="padding:30px 30px 8px;font-family:Georgia,'Times New Roman',serif;">
        <div style="font:700 12px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9aa3b2;">${esc(dateLabel)}</div>
        <div style="margin-top:8px;font-size:26px;line-height:1.25;color:#3d4451;">${esc(greeting(settings.name))}</div>
      </td></tr>
      <tr><td style="padding:6px 30px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3d4451;">

        <div style="margin-top:14px;padding:16px 18px;background:#f4f2fc;border-radius:16px;">
          <div style="font-size:13px;color:#5a4fa3;font-weight:700;">This week · ${week.completed.length} of ${goal} done${days ? ` · 🔥 ${days}-day streak` : ""}</div>
          <div style="margin-top:10px;height:10px;background:#ebe8f9;border-radius:6px;overflow:hidden;">
            <div style="width:${pct}%;height:10px;background:#8478ce;border-radius:6px;"></div>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#6b7484;">${week.open.length} still open this week${week.overdue ? ` · ${week.overdue} overdue` : ""}</div>
        </div>

        ${
          planned.length
            ? section(`Today's plan · ${planned.length}`, planRows)
            : `${section("Today's plan", "", "#9aa3b2")}
               <p style="margin:26px 0 4px;color:#6b7484;">Nothing planned yet — take two minutes now${ideas.length ? ", these are good places to start" : ""}:</p>
               <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${ideaRows}</table>`
        }
        ${planned.length ? section("Also worth a look", ideaRows) : ""}
        ${section("Overdue", overdueRows, "#9e5f5a")}
        ${section(`You finished ${wins.length} yesterday`, winRows, "#4e7a5d")}

        ${
          appUrl
            ? `<p style="margin:28px 0 0;"><a href="${esc(appUrl)}" style="display:inline-block;background:#6f63c0;color:#ffffff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:999px;">Open Calm Priorities</a></p>`
            : ""
        }
        <p style="margin:22px 0 0;font-size:12px;color:#9aa3b2;">One thing at a time. 🌿</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { subject, html, text };
}
