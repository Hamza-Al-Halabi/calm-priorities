/* ------------------------------------------------------------------
   TaskFormModal — one form for both "add" and "edit".
   Fields: title (required), description, deadline, priority pills.
   ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { PRIORITIES, TONES } from "../lib/tones.js";
import { toInputValue } from "../lib/deadlines.js";

const inputClass =
  "w-full rounded-xl border border-linen-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-lav-500";

export default function TaskFormModal({ open, initial, defaultPriority, onClose, onSave }) {
  const editing = Boolean(initial);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(""); // datetime-local string
  const [priority, setPriority] = useState("medium");

  // Refill the form each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setDeadline(initial?.deadline ? toInputValue(initial.deadline) : "");
    setPriority(initial?.priority ?? defaultPriority ?? "medium");
  }, [open, initial, defaultPriority]);

  function handleSave() {
    if (!title.trim()) return;
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
      },
      initial?.id
    );
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit task" : "New task"}>
      <div className="space-y-4">
        <div>
          <label htmlFor="task-title" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
            Title
          </label>
          <input
            id="task-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="What needs your attention?"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="task-desc" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
            Description <span className="font-semibold normal-case text-ink-400">(optional)</span>
          </label>
          <textarea
            id="task-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any details, in your own words."
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label htmlFor="task-deadline" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
            Deadline <span className="font-semibold normal-case text-ink-400">(optional)</span>
          </label>
          <input
            id="task-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
            Priority
          </span>
          <div className="flex gap-2" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={priority === p}
                onClick={() => setPriority(p)}
                className={`flex-1 rounded-full border px-3 py-2 text-sm font-bold ${
                  priority === p
                    ? TONES[p].pillOn
                    : "border-linen-200 bg-white text-ink-600 hover:border-linen-300"
                }`}
              >
                <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${TONES[p].dot}`} />
                {TONES[p].short}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-linen-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="rounded-full bg-lav-600 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-lav-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editing ? "Save changes" : "Add task"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
