import { useEffect, useRef, useState } from "react";

// A hanging fanoos for each hour of the evening. It is dark until the reader scrolls down to that
// hour, then it lights and stays lit — the schedule fills with lamps as the night goes on. Nothing
// flickers or pulses: the light comes from the reader arriving, not from a loop.
export function Lantern({ big }) {
  return (
    <svg className={"lantern" + (big ? " big" : "")} viewBox="0 0 40 70" aria-hidden="true">
      <circle cx="20" cy="4" r="3" className="ln-metal" fill="none" strokeWidth="1.4" />
      <path d="M12 16c0-6 4-9 8-9s8 3 8 9Z" className="ln-cap" />
      <path d="M9 16h22l-2 3H11Z" className="ln-cap" />
      <path d="M11 19h18l4 15-4 15H11l-4-15Z" className="ln-glass" />
      <path d="M11 19h18l4 15-4 15H11l-4-15Z" className="ln-lit" />
      <path d="M20 26c3 4 3 8 0 11-3-3-3-7 0-11Z" className="ln-flame" />
      <path d="M11 19l-4 15 4 15M29 19l4 15-4 15M15 19v30M25 19v30M7 34h26" className="ln-rib" />
      <path d="M11 49h18l-3 4H14Z" className="ln-cap" />
      <path d="M17 53h6l-3 7Z M20 60v6" className="ln-cap" />
      <circle cx="20" cy="67" r="1.6" className="ln-cap" />
    </svg>
  );
}

export function useLit(threshold = 0.6) {
  const ref = useRef(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setLit(true)),
      { rootMargin: `0px 0px -${Math.round((1 - threshold) * 100)}% 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, lit];
}
