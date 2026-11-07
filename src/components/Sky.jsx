import { useEffect, useMemo, useRef } from "react";

// The whole page sits under one sky that is the evening itself: wine-red dusk at the card, indigo
// midnight by the farewell. Nothing here moves on its own — every change (the night deepening,
// the stars coming out, the moon rising, the windows of the city lighting one by one) is driven by
// how far the reader has scrolled, written once per frame as `--p` (0 → 1) on this element.
//
// The skyline is Hyderabad's own: flat roofs crowned with manghs, the windcatchers the city was
// known for, every one of them facing the same way into the sea breeze.

const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const W = 1200, H = 240;

function buildCity(seed, { minH, maxH, mangh, windows, gap }) {
  const r = rng(seed);
  const roofs = [], manghs = [], wins = [];
  let x = -20;
  while (x < W + 20) {
    const w = 46 + r() * 80;
    const h = minH + r() * (maxH - minH);
    const top = H - h;
    roofs.push(`M${x.toFixed(1)} ${H}V${top.toFixed(1)}h${(w * 0.08).toFixed(1)}v-4h${(w * 0.84).toFixed(1)}v4h${(w * 0.08).toFixed(1)}V${H}Z`);
    if (r() < mangh) {
      const n = r() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const mw = 10 + r() * 7, mh = 14 + r() * 16;
        const mx = x + 8 + r() * (w - mw - 16);
        const base = top - 4;
        // the box rises to a slanted hood, open toward the sea — every one leans the same way
        manghs.push(`M${mx.toFixed(1)} ${base}V${(base - mh).toFixed(1)}L${(mx + mw).toFixed(1)} ${(base - mh - mw * 0.75).toFixed(1)}V${base}Z`);
      }
    }
    if (windows) {
      for (let wy = top + 14; wy < H - 14; wy += 20) {
        for (let wx = x + 9; wx < x + w - 12; wx += 15) {
          if (r() < windows) wins.push({ x: wx, y: wy, at: 0.04 + r() * 0.9, warm: r() < 0.7 });
        }
      }
    }
    x += w + gap * r();
  }
  return { roofs: roofs.join(""), manghs: manghs.join(""), wins };
}

// The one house on the street dressed for a wedding: strings of small lamps falling from the
// parapet, the way every family in Sindh lights its home for the week of a shaadi.
function WeddingHouse({ x, w, h }) {
  const top = H - h;
  const strands = [];
  for (let sx = x + 6; sx <= x + w - 6; sx += 9) {
    const len = 40 + ((sx * 7) % 50);
    const beads = [];
    for (let y = top + 6; y < top + len; y += 6) beads.push(<circle key={y} cx={sx} cy={y} r="1.25" />);
    strands.push(<g key={sx}>{beads}</g>);
  }
  const swag = [];
  for (let i = 0; i < 5; i++) {
    const x0 = x + (w / 5) * i, x1 = x0 + w / 5;
    for (let t = 0.08; t < 1; t += 0.12) {
      const cx = x0 + (x1 - x0) * t, cy = top + 4 + Math.sin(Math.PI * t) * 12;
      swag.push(<circle key={`${i}-${t}`} cx={cx} cy={cy} r="1.4" />);
    }
  }
  return (
    <g>
      <path d={`M${x} ${H}V${top}h${w}V${H}Z`} className="sky-front" />
      {/* a domed chhatri on the roof marks it out from its neighbours */}
      <path d={`M${x + w / 2 - 16} ${top}v-10h32v10Z M${x + w / 2 - 18} ${top - 10}a18 16 0 0 1 36 0Z M${x + w / 2 - 1} ${top - 26}h2v-8h-2Z`} className="sky-front" />
      <g className="sky-lights" style={{ "--at": 0.1 }}>{strands}{swag}</g>
    </g>
  );
}

function Mosque({ x }) {
  return (
    <path className="sky-front" d={
      `M${x} ${H}V${H - 70}h90V${H}Z` +
      `M${x + 10} ${H - 70}a35 34 0 0 1 70 0Z` +
      `M${x + 44} ${H - 104}h2v-12h-2Z` +
      `M${x + 100} ${H}V${H - 150}h10V${H}Z` +
      `M${x + 96} ${H - 130}h18v4h-18Z` +
      `M${x + 98} ${H - 150}a7 9 0 0 1 14 0Z M${x + 104.2} ${H - 159}h1.6v-7h-1.6Z`
    } />
  );
}

export default function Sky({ live }) {
  const ref = useRef(null);
  const back = useMemo(() => buildCity(7, { minH: 70, maxH: 150, mangh: 0.55, windows: 0, gap: 4 }), []);
  const front = useMemo(() => buildCity(27122026, { minH: 38, maxH: 104, mangh: 0.7, windows: 0.34, gap: 10 }), []);
  const stars = useMemo(() => {
    const r = rng(1226);
    return Array.from({ length: 90 }, () => ({
      x: r() * 100, y: r() * 62, s: r() < 0.12 ? 2.2 : 1 + r() * 0.8,
      at: 0.18 + r() * 0.62, o: 0.45 + r() * 0.55,
    }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const set = () => {
      raf = 0;
      const m = document.documentElement.scrollHeight - innerHeight;
      const p = live && m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(set); };
    set();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [live]);

  return (
    <div className="sky" ref={ref} aria-hidden="true">
      <i className="sky-dusk" />
      <i className="sky-night" />
      <div className="sky-stars">
        {stars.map((s, i) => (
          <i key={i} style={{ left: s.x + "%", top: s.y + "%", width: s.s, height: s.s, "--at": s.at, "--o": s.o }} />
        ))}
      </div>
      <div className="sky-moon"><i /></div>
      <i className="sky-haze" />
      <svg className="sky-city" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          {/* shared by every lantern on the schedule */}
          <radialGradient id="lanternGlass" cx=".5" cy=".55" r=".6">
            <stop offset="0" stopColor="#fff4cf" /><stop offset=".45" stopColor="#ffc461" /><stop offset="1" stopColor="#c0601c" />
          </radialGradient>
        </defs>
        <g className="sky-back"><path d={back.roofs + back.manghs} /></g>
        <path className="sky-front" d={front.roofs + front.manghs} />
        <Mosque x={810} />
        <WeddingHouse x={262} w={150} h={128} />
        <g className="sky-wins">
          {front.wins.filter((w) => !(w.x > 256 && w.x < 416) && !(w.x > 804 && w.x < 916)).map((w, i) => (
            <rect key={i} x={w.x} y={w.y} width="5" height="8" rx="2.5" ry="2.5"
              className={w.warm ? "" : "cool"} style={{ "--at": w.at }} />
          ))}
        </g>
      </svg>
      <i className="sky-grain" />
    </div>
  );
}
