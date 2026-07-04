/* ------------------------------------------------------------------
   tones.js — the visual identity of each priority, in one place.
   (Tailwind needs full class names in the source, so they live here
   as literal strings instead of being built dynamically.)
   ------------------------------------------------------------------ */

export const PRIORITIES = ["high", "medium", "low"];

export const TONES = {
  high: {
    label: "High priority",
    short: "High",
    dot: "bg-blush-500",
    column: "bg-blush-50/70 border-blush-200",
    count: "bg-blush-100 text-blush-700",
    pillOn: "bg-blush-100 border-blush-200 text-blush-700",
    empty: "Nothing urgent right now — lovely.",
  },
  medium: {
    label: "Medium priority",
    short: "Medium",
    dot: "bg-sand-500",
    column: "bg-sand-50/70 border-sand-200",
    count: "bg-sand-100 text-sand-700",
    pillOn: "bg-sand-100 border-sand-200 text-sand-700",
    empty: "All quiet here.",
  },
  low: {
    label: "Low priority",
    short: "Low",
    dot: "bg-sage-500",
    column: "bg-sage-50/70 border-sage-200",
    count: "bg-sage-100 text-sage-700",
    pillOn: "bg-sage-100 border-sage-200 text-sage-700",
    empty: "Empty for now. Enjoy the space.",
  },
};

/* Deadline badge styles by state (see lib/deadlines.js) */
export const DEADLINE_BADGES = {
  overdue: "bg-blush-100 text-blush-700",
  soon: "bg-sand-100 text-sand-700",
  later: "bg-brook-100 text-brook-700",
  done: "bg-linen-100 text-ink-400",
};
