import { useEffect, useMemo, useRef, useState } from "react";

const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

export default function Intro({ t, lang, guest, onOpened }) {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  const [flash, setFlash] = useState(false);
  const envRef = useRef(null);
  const phone = useMemo(() => matchMedia("(max-width:430px)").matches, []);

  const motes = useMemo(() =>
    Array.from({ length: phone ? 12 : 20 }, (_, i) => ({
      left: Math.random() * 100, s: 1 + Math.random() * 3,
      o: (0.22 + Math.random() * 0.5).toFixed(2),
      dx: (Math.random() * 90 - 45) | 0,
      dur: (10 + Math.random() * 11).toFixed(1),
      del: (Math.random() * 14).toFixed(1),
    })), [phone]);

  const sparks = useMemo(() => {
    const n = phone ? 15 : 22;
    return Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const r = (phone ? 75 : 95) + Math.random() * 130;
      return { x: (Math.cos(a) * r) | 0, y: (Math.sin(a) * r) | 0, del: (0.48 + Math.random() * 0.22).toFixed(2) };
    });
  }, [phone]);

  useEffect(() => {
    const el = envRef.current;
    const tilt = (rx, ry) => {
      if (!el || el.classList.contains("open")) return;
      el.style.setProperty("--rx", rx.toFixed(1) + "deg");
      el.style.setProperty("--ry", ry.toFixed(1) + "deg");
    };
    const onMove = (e) => tilt(10 - (e.clientY / innerHeight - 0.5) * 13, (e.clientX / innerWidth - 0.5) * 15);
    const onOri = (e) => {
      const b = Math.max(-26, Math.min(26, (e.beta || 0) - 40));
      const g = Math.max(-26, Math.min(26, e.gamma || 0));
      tilt(10 - b * 0.3, g * 0.42);
    };
    if (phone && window.DeviceOrientationEvent) addEventListener("deviceorientation", onOri, { passive: true });
    else if (matchMedia("(hover:hover)").matches) addEventListener("pointermove", onMove);
    return () => { removeEventListener("deviceorientation", onOri); removeEventListener("pointermove", onMove); };
  }, [phone]);

  const doOpen = () => {
    if (open) return;
    setOpen(true); buzz([12, 60, 20]);
    setTimeout(() => setFlash(true), 1700);
    setTimeout(() => onOpened(), 2000);
    setTimeout(() => setGone(true), 3400);
  };

  if (gone) return flash ? <div className="flash go" /> : null;

  return (
    <>
      <div id="intro" className={open ? "done-later" : ""} style={open ? { opacity: 0, pointerEvents: "none", transition: "opacity 1.2s cubic-bezier(.22,.68,.24,1) 2s" } : undefined}>
        <i className="ajrak" />
        <div className="halo" />
        <div>
          {motes.map((m, i) => (
            <i key={i} className="mote" style={{
              left: m.left + "%", bottom: "-4%", width: m.s, height: m.s,
              "--o": m.o, "--dx": m.dx + "px",
              animationDuration: m.dur + "s", animationDelay: m.del + "s",
            }} />
          ))}
        </div>
        <div className="scene">
          {guest && <div className="greet">Dear {guest},</div>}
          <div className="pre-sd">{t.bismillah}</div>
          <div className="pre">Tashkeen &amp; Anusha</div>
          <div className={"pre-sub" + (lang === "sd" ? " sd-t" : "")}>{t.invite}</div>
          <div ref={envRef} className={"env" + (open ? " open" : "")} onClick={doOpen}>
            <div className="face"><i className="ajrak" /></div>
            <div className="letter" />
            <div className="pocket"><i className="ajrak" /></div>
            <div className="flap"><i className="ajrak" /></div>
            <div className="rule" />
            <div className="burst" />
            <div style={{ position: "absolute", left: "50%", top: "56%", width: 2, height: 2, zIndex: 5, transform: "translate(-50%,-50%)" }}>
              {sparks.map((s, i) => (
                <i key={i} className="spark" style={{ "--x": s.x + "px", "--y": s.y + "px", animationDelay: s.del + "s" }} />
              ))}
            </div>
            <button className="seal" aria-label="Open the invitation" onClick={doOpen}>
              <svg viewBox="0 0 100 100">
                <defs>
                  <radialGradient id="wax" cx="36%" cy="28%">
                    <stop offset="0%" stopColor="#f9ecc9" /><stop offset="42%" stopColor="#c9a35e" /><stop offset="100%" stopColor="#77571f" />
                  </radialGradient>
                </defs>
                <circle className="ping" cx="50" cy="50" r="28" fill="none" stroke="#f7e3b5" strokeWidth="1" />
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
      <div className={"flash" + (flash ? " go" : "")} />
    </>
  );
}
