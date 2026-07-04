/* Slim header: app name on the left, the two global actions on the right. */

export default function Header({ onAddTask, onOpenReminders, remindersOn }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <div className="mr-auto">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink-900">
          Calm Priorities
        </h1>
        <p className="text-sm text-ink-600">one thing at a time</p>
      </div>

      <button
        onClick={onOpenReminders}
        className="inline-flex items-center gap-2 rounded-full border border-linen-200 bg-white/80 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-lav-200 hover:text-lav-700"
        title="Reminder settings"
      >
        <BellIcon className="size-4" />
        Reminders
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
