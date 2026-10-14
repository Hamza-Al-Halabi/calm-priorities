/* ------------------------------------------------------------------
   PriorityColumn — one of the three priority boxes. The container is
   washed in its priority's tint; the task cards inside stay white so
   they read clearly. Each column has its own quiet "+ Add" button.
   ------------------------------------------------------------------ */

import { useState } from "react";
import TaskCard from "./TaskCard.jsx";
import { PlusIcon } from "./Header.jsx";
import { TONES } from "../lib/tones.js";
import { sortTasks } from "../lib/deadlines.js";

export default function PriorityColumn({
  priority,
  tasks,
  now,
  todayKey,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onTogglePlan,
  onMove,
}) {
  const tone = TONES[priority];
  const [over, setOver] = useState(false);
  const open = tasks.filter((t) => !t.done).length;

  return (
    <section
      className={`flex flex-col rounded-3xl border p-4 transition sm:p-5 ${tone.column} ${over ? "drop-target" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMove(id, priority);
      }}
    >
      <header className="flex items-center gap-2.5">
        <span className={`size-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
        <h2 className="text-sm font-bold text-ink-900">{tone.label}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone.count}`}>
          {open} open
        </span>
        <button
          onClick={() => onAdd(priority)}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-ink-600 hover:bg-white/70 hover:text-lav-700"
          aria-label={`Add a ${tone.short.toLowerCase()} priority task`}
        >
          <PlusIcon className="size-3.5" />
          Add
        </button>
      </header>

      {tasks.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-linen-300 bg-white/50 px-4 py-6 text-center text-sm text-ink-600">
          {tone.empty}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sortTasks(tasks).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              now={now}
              todayKey={todayKey}
              onTogglePlan={onTogglePlan}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
