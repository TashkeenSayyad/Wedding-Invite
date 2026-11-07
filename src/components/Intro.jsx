import { useEffect, useMemo, useRef, useState } from "react";
import DateMask from "./DateMask.jsx";

const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

// The guest arrives at a door, not an envelope: a pair of carved haveli doors in wine lacquer
// and gold, under a toran of marigold and jasmine, with lamplight and the card waiting behind
// them. Tapping the seal swings the doors in and carries the reader through the arch.

// An eight-petalled ajrak rosette, the same motif as the kakar jaal behind the page.
function Rosette({ cx, cy, r }) {
  const petals = [];
  for (let i = 0; i < 8; i++) {
    petals.push(<ellipse key={i} cx={cx} cy={cy - r * 0.55} rx={r * 0.2} ry={r * 0.44}
      transform={`rotate(${i * 45} ${cx} ${cy})`} />);
  }
  return (
    <g className="ro">
      <circle cx={cx} cy={cy} r={r} className="ro-ring" />
      <g className="ro-pet">{petals}</g>
      <circle cx={cx} cy={cy} r={r * 0.17} className="ro-eye" />
    </g>
  );
}

const Stud = ({ x, y }) => <circle cx={x} cy={y} r="1.7" fill="url(#brass)" />;

// one leaf, drawn as the left; the right is the same leaf mirrored
function Leaf({ side }) {
  const studs = [];
  for (let y = 40; y < 296; y += 15) studs.push(<Stud key={"m" + y} x={96.5} y={y} />);
  [[14, 138], [86, 138], [14, 222], [86, 222], [14, 232], [86, 232], [14, 286], [86, 286]].forEach(([x, y]) =>
    studs.push(<Stud key={x + "-" + y} x={x} y={y} />));
  const art = (
    <>
      <path d="M0 300V112C0 58 52 38 100 6V300Z" fill="url(#lac)" />
      <path d="M0 300V112C0 58 52 38 100 6V300Z" fill="url(#grainlines)" opacity=".5" />
      <path d="M6 294V114C6 64 52 45 93 18V294Z" className="inlay" />
      {/* the arched head panel, filled with a jaali lattice */}
      <path d="M14 128V117C14 77 54 61 86 39V128Z" className="pane" />
      <path d="M14 128V117C14 77 54 61 86 39V128Z" fill="url(#jaali)" />
      <path d="M14 128V117C14 77 54 61 86 39V128Z" className="inlay" />
      {/* the middle panel carries the rosette */}
      <rect x="14" y="138" width="72" height="84" className="pane" />
      <rect x="14" y="138" width="72" height="84" className="inlay" />
      <rect x="19" y="143" width="62" height="74" className="inlay thin" />
      <Rosette cx={50} cy={180} r={24} />
      {/* the kick panel, a lattice again */}
      <rect x="14" y="232" width="72" height="54" className="pane" />
      <rect x="14" y="232" width="72" height="54" fill="url(#jaali)" />
      <rect x="14" y="232" width="72" height="54" className="inlay" />
      {/* the meeting stile and its studs */}
      <path d="M93 18L100 6V300H93Z" fill="url(#stile)" />
      {studs}
      {/* a ring knocker on its back-plate */}
      <circle cx="80" cy="180" r="4.2" fill="url(#brass)" />
      <circle cx="80" cy="189" r="7.5" className="ring" />
    </>
  );
  return (
    <svg viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true">
      {side === "r" ? <g transform="translate(100 0) scale(-1 1)">{art}</g> : art}
    </svg>
  );
}

// a garland that droops between two nails, threaded with marigold and the odd jasmine bud
function Garland({ x0, x1, y, sag, step = 6.4 }) {
  const beads = [];
  const n = Math.round((x1 - x0) / step);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, yy = y + Math.sin(Math.PI * t) * sag;
    const k = i % 5;
    beads.push(<circle key={i} cx={x} cy={yy} r={k === 2 ? 2.2 : 3.1}
      fill={k === 2 ? "url(#jasmine)" : k % 2 ? "url(#marigoldD)" : "url(#marigold)"} />);
  }
  return <g>{beads}</g>;
}

function Tassel({ x, y, len }) {
  const beads = [];
  for (let yy = y; yy < y + len; yy += 6) beads.push(<circle key={yy} cx={x} cy={yy} r="2.6" fill={(yy - y) % 12 ? "url(#marigoldD)" : "url(#marigold)"} />);
  beads.push(<path key="leaf" d={`M${x} ${y + len}c-4 4-4 9 0 13c4-4 4-9 0-13Z`} fill="#3f6b2c" />);
  return <g>{beads}</g>;
}

function Frame() {
  const opening = "M20 330V142C20 88 72 68 120 36C168 68 220 88 220 142V330Z";
  return (
    <svg className="frame" viewBox="0 0 240 340" aria-hidden="true">
      <defs>
        <linearGradient id="lac" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8f2036" /><stop offset=".5" stopColor="#5e1222" /><stop offset="1" stopColor="#350a15" />
        </linearGradient>
        <pattern id="grainlines" width="100" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 3c30-2 60 2 100 0M0 7.5c40 1 70-2 100 1" fill="none" stroke="#1d0409" strokeWidth=".5" opacity=".55" />
        </pattern>
        <pattern id="jaali" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0h9M0 0v9" stroke="#e3c27f" strokeWidth=".8" opacity=".75" />
          <circle cx="0" cy="0" r="1.1" fill="#f7e3b5" />
        </pattern>
        <linearGradient id="stile" x1="0" x2="1">
          <stop offset="0" stopColor="#7d5a26" /><stop offset=".5" stopColor="#f2d593" /><stop offset="1" stopColor="#8a6a34" />
        </linearGradient>
        <radialGradient id="brass" cx=".35" cy=".3">
          <stop offset="0" stopColor="#fff3d4" /><stop offset=".5" stopColor="#d6ad62" /><stop offset="1" stopColor="#6b4c1c" />
        </radialGradient>
        <radialGradient id="marigold" cx=".38" cy=".32">
          <stop offset="0" stopColor="#ffe08a" /><stop offset=".55" stopColor="#f5a623" /><stop offset="1" stopColor="#b55d0c" />
        </radialGradient>
        <radialGradient id="marigoldD" cx=".38" cy=".32">
          <stop offset="0" stopColor="#ffc56b" /><stop offset=".55" stopColor="#e2741a" /><stop offset="1" stopColor="#8f3a08" />
        </radialGradient>
        <radialGradient id="jasmine" cx=".4" cy=".35">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e9dfc6" />
        </radialGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4d0e1c" /><stop offset="1" stopColor="#2a0710" />
        </linearGradient>
      </defs>
      <path d={"M0 340V0H240V340Z" + opening} fill="url(#wall)" fillRule="evenodd" />
      <path d="M5 340V5H235V340" className="fr-line" />
      <path d="M10 340V10H230V340" className="fr-line thin" />
      {/* the spandrels either side of the arch carry a rosette each */}
      <g className="spandrel"><Rosette cx={34} cy={40} r={15} /><Rosette cx={206} cy={40} r={15} /></g>
      {/* a beaded moulding — a dotted stroke with round caps — running round the arch */}
      <path d="M13 340V140C13 84 68 60 120 27C172 60 227 84 227 140V340" className="fr-beads" />
      <path d="M20 330V142C20 88 72 68 120 36C168 68 220 88 220 142V330" className="fr-line" />
      <path d="M0 330H240V340H0Z" fill="url(#stile)" opacity=".85" />
      {/* the toran: marigold swags across the lintel, with strings falling between them */}
      <g className="toran">
        <Garland x0={4} x1={64} y={8} sag={16} />
        <Garland x0={64} x1={120} y={8} sag={20} />
        <Garland x0={120} x1={176} y={8} sag={20} />
        <Garland x0={176} x1={236} y={8} sag={16} />
        <Tassel x={4} y={14} len={70} />
        <Tassel x={64} y={14} len={46} />
        <Tassel x={120} y={14} len={30} />
        <Tassel x={176} y={14} len={46} />
        <Tassel x={236} y={14} len={70} />
      </g>
    </svg>
  );
}

export default function Intro({ t, lang, guest, onOpened }) {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  const doorRef = useRef(null);
  const sceneRef = useRef(null);
  const letterRef = useRef(null);
  const phone = useMemo(() => matchMedia("(max-width:430px)").matches, []);

  useEffect(() => {
    const el = doorRef.current;
    const tilt = (rx, ry) => {
      if (!el || el.classList.contains("open")) return;
      el.style.setProperty("--rx", rx.toFixed(1) + "deg");
      el.style.setProperty("--ry", ry.toFixed(1) + "deg");
    };
    const onMove = (e) => tilt(4 - (e.clientY / innerHeight - 0.5) * 8, (e.clientX / innerWidth - 0.5) * 12);
    const onOri = (e) => {
      const b = Math.max(-26, Math.min(26, (e.beta || 0) - 40));
      const g = Math.max(-26, Math.min(26, e.gamma || 0));
      tilt(4 - b * 0.22, g * 0.34);
    };
    if (phone && window.DeviceOrientationEvent) addEventListener("deviceorientation", onOri, { passive: true });
    else if (matchMedia("(hover:hover)").matches) addEventListener("pointermove", onMove);
    return () => { removeEventListener("deviceorientation", onOri); removeEventListener("pointermove", onMove); };
  }, [phone]);

  const doOpen = () => {
    if (open) return;
    // The walk through the arch ends with the card behind the door sitting exactly where the
    // card on s1 already is, so when the intro fades there is one card, not two cross-fading.
    // Both are measured now, before anything moves: the scene scales about the card's own centre
    // and then slides that centre onto the s1 card's.
    const sc = sceneRef.current, L = letterRef.current?.getBoundingClientRect();
    const C = document.querySelector(".cardwrap")?.getBoundingClientRect();
    if (sc && L && C && L.width) {
      const S = sc.getBoundingClientRect();
      const lx = L.left + L.width / 2, ly = L.top + L.height / 2;
      sc.style.transformOrigin = `${lx - S.left}px ${ly - S.top}px`;
      sc.style.setProperty("--zoom", `translate(${C.left + C.width / 2 - lx}px, ${C.top + C.height / 2 - ly}px) scale(${C.width / L.width})`);
    }
    setOpen(true); buzz([12, 60, 20]);
    // With reduced motion the doors and the walk through the arch are switched off in CSS, so
    // these waits would leave the reader at a closed door wondering whether the tap registered.
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => onOpened(), still ? 120 : 2300);
    setTimeout(() => setGone(true), still ? 260 : 3500);
  };

  if (gone) return null;

  return (
    <div id="intro" className={open ? "open" : ""}>
      <i className="ajrak" />
      <div className="scene" ref={sceneRef}>
        <div className="pre-block">
          {guest && <div className={"greet" + (lang === "sd" ? " sd-t" : "")}>{t.greet(guest)}</div>}
          <div className="pre-sd">{t.bismillah}</div>
          <div className="pre">Tashkeen &amp; Anusha</div>
          <div className={"pre-sub" + (lang === "sd" ? " sd-t" : "")}>{t.invite}</div>
        </div>
        <div ref={doorRef} className={"door" + (open ? " open" : "")} onClick={doOpen}>
          <div className="inside">
            <i className="lamp" />
            {/* the card is visible through the doorway as the leaves part, so the date on it
                wears the same leaf of gold as everywhere else until the heart is scratched */}
            <div className="letter" ref={letterRef}><DateMask t={t} lang={lang} /></div>
          </div>
          <div className="leaf l"><Leaf side="l" /></div>
          <div className="leaf r"><Leaf side="r" /></div>
          <Frame />
          <button className="seal" aria-label={t.tapSeal} onClick={doOpen}>
            <svg viewBox="0 0 100 100">
              <defs>
                <radialGradient id="wax" cx="36%" cy="28%">
                  <stop offset="0%" stopColor="#f9ecc9" /><stop offset="42%" stopColor="#c9a35e" /><stop offset="100%" stopColor="#77571f" />
                </radialGradient>
              </defs>
              <path fill="url(#wax)" d="M50 11c9-3 15 5 21 7s14-1 17 7-3 14-2 21 8 13 3 20-13 5-19 11-6 13-15 15-12-7-20-8-14 3-19-4 0-13-2-21-8-13-5-20 12-8 17-13 6-14 15-15 6 1 9 0Z" />
              <path d="M50 21a29 29 0 1 0 .1 0Z" fill="none" stroke="#5a3f16" strokeWidth=".7" opacity=".5" />
              <path d="M50 24l2.6 6.1L59 32.6l-6.4 2.5L50 41l-2.6-5.9L41 32.6l6.4-2.5z" fill="#4a3411" opacity=".42" />
              <text x="50" y="62" textAnchor="middle" fontFamily="Cormorant SC,serif" fontSize="21" fontWeight="700" letterSpacing="1.5" fill="#46300f" opacity=".9">T&amp;A</text>
            </svg>
          </button>
        </div>
        <div className={"tap" + (lang === "sd" ? " sd-t" : "")}>{t.tapSeal}</div>
      </div>
      <i className="grain" />
    </div>
  );
}
