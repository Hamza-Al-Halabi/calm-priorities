/* Header: app name, the three views (Today / Board / Week), and the global actions. */

const VIEWS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "board", label: "Board" },
];

export default function Header({ view, onView, onAddTask, onOpenSettings, remindersOn }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <div className="mr-auto">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink-900">
          Calm Priorities
        </h1>
        <p className="text-sm text-ink-600">one thing at a time</p>
      </div>

      <nav
        className="order-last flex w-full gap-1 rounded-full border border-linen-200 bg-white/80 p-1 sm:order-none sm:w-auto"
        aria-label="Views"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => onView(v.id)}
            aria-current={view === v.id ? "page" : undefined}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-bold sm:flex-none ${
              view === v.id
                ? "bg-lav-100 text-lav-700 shadow-soft"
                : "text-ink-600 hover:text-lav-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <button
        onClick={onOpenSettings}
        className="inline-flex items-center gap-2 rounded-full border border-linen-200 bg-white/80 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-lav-200 hover:text-lav-700"
        title="Settings and reminders"
      >
        <BellIcon className="size-4" />
        Settings
        <span
          className={`size-1.5 rounded-full ${remindersOn ? "bg-sage-500" : "bg-linen-300"}`}
          aria-hidden="true"
        />
      </button>

      <button
        onClick={onAddTask}
        className="inline-flex items-center gap-2 rounded-full bg-lav-600 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-lav-500"
      >
        <PlusIcon className="size-4" />
        Add task
      </button>
    </header>
  );
}

export function PlusIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function BellIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
