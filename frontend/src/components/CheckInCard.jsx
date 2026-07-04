/* ------------------------------------------------------------------
   CheckInCard — the emotional center of the app.
   One calm sentence (the "assistant voice"), the progress summary
   ("5 of 12 tasks completed") and a soft lavender→sage progress bar.
   ------------------------------------------------------------------ */

function checkInMessage(done, total) {
  if (total === 0) return "A clear space. Add whatever is on your mind.";
  if (done === total) return "Everything's done. Take a breath — you've earned it.";
  if (done / total >= 0.5) return "Past halfway. Steady does it.";
  if (done > 0) return "One thing at a time — it's working.";
  return "Start with just one. That's enough.";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Hello, night owl";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function CheckInCard({ done, total }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section className="rounded-3xl border border-linen-200 bg-white/80 p-6 shadow-soft sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
        {greeting()} ·{" "}
        {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <h2 className="mt-2 font-display text-2xl font-normal leading-snug text-ink-900 sm:text-[1.7rem]">
        {checkInMessage(done, total)}
      </h2>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-ink-600">
            {total === 0
              ? "No tasks yet"
              : `${done} of ${total} task${total === 1 ? "" : "s"} completed`}
          </span>
          <span className="text-ink-400">{pct}%</span>
        </div>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-linen-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tasks completed"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-lav-500 to-sage-500 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
