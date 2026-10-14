/* BoardView — the three priority boxes. Drag a card onto another box to re-prioritize it. */

import PriorityColumn from "./PriorityColumn.jsx";
import { PRIORITIES } from "../lib/tones.js";

export default function BoardView({ tasks, now, todayKey, handlers }) {
  const groups = { high: [], medium: [], low: [] };
  for (const t of tasks) (groups[t.priority] ?? groups.medium).push(t);

  return (
    <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
      {PRIORITIES.map((p) => (
        <PriorityColumn key={p} priority={p} tasks={groups[p]} now={now} todayKey={todayKey} {...handlers} />
      ))}
    </div>
  );
}
