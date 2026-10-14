/* ------------------------------------------------------------------
   FocusItem — one row in today's plan: tick it off, see its priority
   and deadline, or take it out of the plan (it stays on the board).
   ------------------------------------------------------------------ */

import { CheckIcon } from "./Header.jsx";
import { deadlineState, formatDeadline } from "../lib/deadlines.js";
import { TONES, DEADLINE_BADGES } from "../lib/tones.js";

export default function FocusItem({ task, now, onToggle, onEdit, onUnplan }) {
  const state = deadlineState(task, now);
  return (
    <li
      className={`group flex items-center gap-3 rounded-2xl border border-linen-200 bg-white px-3.5 py-3 shadow-soft animate-fade-up ${
        task.done ? "opacity-60" : "hover:shadow-lift"
      }`}
    >
      <button
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Mark “${task.title}” as to do` : `Mark “${task.title}” as done`}
        onClick={() => onToggle(task.id)}
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${
          task.done
            ? "animate-pop border-sage-500 bg-sage-500 text-white"
            : "border-linen-300 bg-white text-transparent hover:border-sage-500 hover:text-sage-200"
        }`}
      >
        <CheckIcon className="size-4" />
      </button>

      <button
        onClick={() => onEdit(task)}
        className="min-w-0 flex-1 text-left"
        title="Edit task"
      >
        <span
          className={`block truncate text-[0.95rem] font-bold text-ink-900 ${
            task.done ? "line-through decoration-ink-400/70 decoration-2" : ""
          }`}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs font-semibold text-ink-400">
          <span className={`size-2 rounded-full ${TONES[task.priority].dot}`} />
          {TONES[task.priority].short}
          {task.deadline && !task.done && (
            <span className={`rounded-full px-2 py-0.5 font-bold ${DEADLINE_BADGES[state]}`}>
              {formatDeadline(task.deadline, now)}
            </span>
          )}
        </span>
      </button>

      <button
        onClick={() => onUnplan(task.id)}
        aria-label={`Remove “${task.title}” from today's plan`}
        title="Remove from today's plan"
        className="rounded-full p-1.5 text-ink-400 opacity-0 hover:bg-linen-100 hover:text-ink-600 focus:opacity-100 group-hover:opacity-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </li>
  );
}
