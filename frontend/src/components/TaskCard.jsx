/* ------------------------------------------------------------------
   TaskCard — one task. A round "pebble" checkbox fills sage when done,
   completed tasks fade and cross out, and Delete asks softly first
   (a two-step inline confirm instead of a jarring popup).
   ------------------------------------------------------------------ */

import { useState } from "react";
import { deadlineState, formatDeadline } from "../lib/deadlines.js";
import { DEADLINE_BADGES } from "../lib/tones.js";

const STATE_LABEL = { overdue: "Overdue", soon: "Due soon", later: "", done: "" };

export default function TaskCard({ task, now, onToggle, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const state = deadlineState(task, now);

  return (
    <li
      className={`group rounded-2xl border border-linen-200 bg-white p-4 shadow-soft transition ${
        task.done ? "opacity-60" : "hover:shadow-lift"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Mark “${task.title}” as to do` : `Mark “${task.title}” as done`}
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
            task.done
              ? "border-sage-500 bg-sage-500 text-white"
              : "border-linen-300 bg-white text-transparent hover:border-sage-500"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-[0.95rem] font-bold leading-snug text-ink-900 ${
              task.done ? "line-through decoration-ink-400/70 decoration-2" : ""
            }`}
          >
            {task.title}
          </p>

          {task.description && (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {task.description}
            </p>
          )}

          {task.deadline && (
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${DEADLINE_BADGES[state]}`}
            >
              {STATE_LABEL[state] ? `${STATE_LABEL[state]} · ` : ""}
              {formatDeadline(task.deadline, now)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-linen-100 pt-2.5">
        {confirming ? (
          <>
            <span className="mr-auto text-xs font-semibold text-ink-600">Delete this task?</span>
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-full bg-blush-100 px-3 py-1.5 text-xs font-bold text-blush-700 hover:bg-blush-200"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-linen-100"
            >
              Keep it
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onToggle(task.id)}
              className="mr-auto rounded-full px-3 py-1.5 text-xs font-bold text-sage-700 hover:bg-sage-50"
            >
              {task.done ? "Mark as to do" : "Mark done"}
            </button>
            <button
              onClick={() => onEdit(task)}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-linen-100"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-blush-50 hover:text-blush-700"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
