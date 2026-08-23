import { useEffect, useMemo, useRef, useState } from "react";

const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

export default function Intro({ t, lang, guest, onOpened }) {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  const [flash, setFlash] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [sound, setSound] = useState(false);
  const vidRef = useRef(null);
  const frameRef = useRef(null);
  const doneRef = useRef(false);
  const phone = useMemo(() => matchMedia("(max-width:430px)").matches, []);
  const sd = lang === "sd";

  const motes = useMemo(() =>
    Array.from({ length: phone ? 12 : 20 }, (_, i) => ({
      left: Math.random() * 100, s: 1 + Math.random() * 3,
      o: (0.22 + Math.random() * 0.5).toFixed(2),
      dx: (Math.random() * 90 - 45) | 0,
      dur: (10 + Math.random() * 11).toFixed(1),
      del: (Math.random() * 14).toFixed(1),
    })), [phone]);

  useEffect(() => {
    const el = frameRef.current;
    const tilt = (rx, ry) => {
      if (!el) return;
      el.style.setProperty("--rx", rx.toFixed(1) + "deg");
      el.style.setProperty("--ry", ry.toFixed(1) + "deg");
    };
    const onMove = (e) => tilt(6 - (e.clientY / innerHeight - 0.5) * 8, (e.clientX / innerWidth - 0.5) * 10);
    const onOri = (e) => {
      const b = Math.max(-26, Math.min(26, (e.beta || 0) - 40));
      const g = Math.max(-26, Math.min(26, e.gamma || 0));
      tilt(6 - b * 0.2, g * 0.3);
    };
    if (phone && window.DeviceOrientationEvent) addEventListener("deviceorientation", onOri, { passive: true });
    else if (matchMedia("(hover:hover)").matches) addEventListener("pointermove", onMove);
    return () => { removeEventListener("deviceorientation", onOri); removeEventListener("pointermove", onMove); };
  }, [phone]);

  // The video is the reveal: try to start it muted (which browsers allow without
  // a gesture). If that is refused, fall back to a tap. Reduced motion waits for
  // the tap either way.
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setNeedsTap(true); return; }
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => setNeedsTap(true));
  }, []);

  const enter = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setOpen(true); buzz([12, 60, 20]);
    const v = vidRef.current;
    if (v) { try { v.pause(); } catch {} }
    setTimeout(() => setFlash(true), 200);
    setTimeout(() => onOpened(), 500);
    setTimeout(() => setGone(true), 1900);
  };

  const play = async () => {
    const v = vidRef.current;
    if (!v || doneRef.current) return;
    buzz(12);
    try { await v.play(); setNeedsTap(false); } catch { setNeedsTap(true); }
  };

  const toggleSound = async (e) => {
    e.stopPropagation();
    const v = vidRef.current;
    if (!v) return;
    buzz(8);
    const next = !sound;
    v.muted = !next;
    setSound(next);
    if (next && v.paused) { try { await v.play(); setNeedsTap(false); } catch { v.muted = true; setSound(false); } }
  };

  // Never strand a guest on a still frame if the clip cannot load.
  const onError = () => { setTimeout(enter, 1200); };

  if (gone) return flash ? <div className="flash go" /> : null;

  return (
    <>
      <div id="intro" style={open ? { opacity: 0, pointerEvents: "none", transition: "opacity 1s cubic-bezier(.22,.68,.24,1) .4s" } : undefined}>
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
          <div className={"pre-sub" + (sd ? " sd-t" : "")}>{t.invite}</div>

          <div ref={frameRef} className={"vidframe" + (playing ? " live" : "")} onClick={needsTap ? play : undefined}>
            <video
              ref={vidRef}
              className="introvid"
              poster="./assets/intro-poster.webp"
              playsInline
              muted={!sound}
              preload="auto"
              onPlaying={() => { setPlaying(true); setNeedsTap(false); }}
              onEnded={enter}
              onError={onError}
            >
              <source src="./assets/intro.webm" type="video/webm" />
              <source src="./assets/intro.mp4" type="video/mp4" />
            </video>
            <div className="rule" />
            {needsTap && (
              <button className="vidplay" onClick={play} aria-label={t.tapPlay}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
              </button>
            )}
          </div>

          <div className="introbar">
            <button className="pill" onClick={toggleSound} aria-label={sound ? t.soundOff : t.soundOn} aria-pressed={sound}>
              {sound ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="m16.5 9.5 5 5m0-5-5 5" /></svg>
              )}
              <span className={sd ? "sd-t" : ""}>{sound ? t.soundOff : t.soundOn}</span>
            </button>
            <button className="pill" onClick={enter}>
              <span className={sd ? "sd-t" : ""}>{t.enter}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5" /></svg>
            </button>
          </div>
        </div>
        <i className="grain" />
      </div>
      <div className={"flash" + (flash ? " go" : "")} />
    </>
  );
}
