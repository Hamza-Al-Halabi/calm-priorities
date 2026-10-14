/* A tiny confetti burst. Re-fires whenever `burst` changes to a new number > 0. */

import { useEffect, useMemo, useState } from "react";

const COLORS = ["lav-500", "sage-500", "sand-500", "blush-500", "brook-600"];

export default function Confetti({ burst }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!burst) return;
    setActive(true);
    const id = setTimeout(() => setActive(false), 1800);
    return () => clearTimeout(id);
  }, [burst]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 120 + Math.random() * 220;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 60,
          rot: Math.round(Math.random() * 720 - 360),
          color: COLORS[i % COLORS.length],
          delay: Math.random() * 90,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst]
  );

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-1/3">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute block h-2 w-1.5 rounded-sm"
            style={{
              background: `var(--color-${p.color})`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
              animation: `confetti 1500ms ease-out ${p.delay}ms both`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
