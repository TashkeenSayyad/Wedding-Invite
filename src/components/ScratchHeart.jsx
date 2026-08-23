import { useEffect, useId, useRef, useState } from "react";

const HEART = "M150 251.25 C18.75 168.75 7.5 90 61.875 48.75 C110.625 13.125 150 54.375 150 86.25 C150 54.375 189.375 13.125 238.125 48.75 C292.5 90 281.25 168.75 150 251.25 Z";
const REVEAL_AT = 0.65; // fraction of the foil itself (not the whole canvas) that must be scratched away
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

export default function ScratchHeart({ t, lang, onDone }) {
  const cvRef = useRef(null);
  const ringRef = useRef(null);
  const gradId = useId();
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const len = ring.getTotalLength();
    ring.style.strokeDasharray = String(len);
    ring.style.strokeDashoffset = String(len * (1 - pct));
  }, [pct]);

  useEffect(() => {
    const cv = cvRef.current;
    const W = 300, H = 270, dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.scale(dpr, dpr);
    const path = new Path2D(HEART);

    // gold foil cover, clipped to the heart
    ctx.save();
    ctx.clip(path);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#8a6a34"); g.addColorStop(0.35, "#e9c87e");
    g.addColorStop(0.5, "#f7e3b5"); g.addColorStop(0.65, "#d9b264"); g.addColorStop(1, "#8a6a34");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // brushed texture
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = Math.random() > 0.5 ? "#fff6dd" : "#7c5c26";
      ctx.lineWidth = Math.random() * 1.2;
      const y0 = Math.random() * H;
      ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0 + (Math.random() * 22 - 11)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // etched hint on the foil, set between two hairlines
    ctx.fillStyle = "rgba(77,14,28,.85)";
    ctx.font = "600 12px 'Cormorant SC', serif";
    ctx.textAlign = "center";
    const hint = lang === "sd" ? "هتي کرچيو" : "SCRATCH HERE";
    ctx.fillText(hint, W / 2, 132);
    const half = ctx.measureText(hint).width / 2;
    ctx.strokeStyle = "rgba(77,14,28,.5)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - half - 26, 127.5); ctx.lineTo(W / 2 - half - 8, 127.5);
    ctx.moveTo(W / 2 + half + 8, 127.5); ctx.lineTo(W / 2 + half + 26, 127.5);
    ctx.stroke();
    ctx.restore();
    // heart outline on top
    ctx.save();
    ctx.strokeStyle = "rgba(247,227,181,.9)"; ctx.lineWidth = 1.6;
    ctx.stroke(path); ctx.restore();

    // progress is measured against the foil actually painted, so the ring starts empty
    const opaqueCount = () => {
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4 * 9) if (d[i] >= 40) n++;
      return n;
    };
    const foilTotal = opaqueCount();

    let drawing = false, strokes = 0, finished = false, last = null;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    };
    const scratch = (x, y) => {
      ctx.save();
      ctx.clip(path);
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 44; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      const [lx, ly] = last || [x, y];
      ctx.moveTo(lx, ly); ctx.lineTo(x, y + 0.01); ctx.stroke();
      ctx.restore();
      last = [x, y];
    };
    const check = () => {
      if (finished || !foilTotal) return;
      const p = 1 - opaqueCount() / foilTotal;
      setPct(Math.min(1, p / REVEAL_AT));
      if (p > REVEAL_AT) {
        finished = true;
        buzz([14, 40, 14, 40, 30]);
        setDone(true);
        setPct(1);
        onDoneRef.current && onDoneRef.current();
      }
    };
    const down = (e) => {
      e.preventDefault();
      drawing = true; last = null;
      try { cv.setPointerCapture(e.pointerId); } catch {}
      const [x, y] = pos(e); scratch(x, y); buzz(6);
    };
    const move = (e) => {
      if (!drawing || finished) return;
      const [x, y] = pos(e); scratch(x, y);
      if (++strokes % 4 === 0) check();
    };
    const up = () => {
      if (!drawing) return;
      drawing = false; last = null;
      check();
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
    return () => {
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
    };
  }, [lang]);

  return (
    <div>
      <div className={"scratch" + (done ? " done" : "")}>
        <div className="heartbase">
          <b>27 · 12 · 2026</b>
          <i />
          <small className={lang === "sd" ? "sd-t" : ""}>{done ? t.revealed : t.saveDate}</small>
        </div>
        <canvas ref={cvRef} style={{ width: 300, height: 270 }} role="img" aria-label={t.scratchHint} />
        <svg className="heartring" viewBox="0 0 300 270">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="300" y2="270" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f7e3b5" />
              <stop offset="1" stopColor="#c9a35e" />
            </linearGradient>
          </defs>
          <path className="heartring-base" d={HEART} fill="none" strokeWidth="1.4" />
          <path ref={ringRef} d={HEART} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.4" strokeLinecap="round" className="heartring-fill" />
        </svg>
      </div>
      {!done && (
        <div className={"sc-hint" + (lang === "sd" ? " sd-t" : "")}>
          {pct > 0.45 ? t.scratchAlmost : t.scratchHint}
        </div>
      )}
    </div>
  );
}
