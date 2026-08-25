import { useEffect, useMemo, useRef, useState } from "react";

// A WhatsApp link cannot give the family a headcount, and free-text replies arrive in twenty
// different shapes. This sheet asks the two questions that matter — how many, and who — then
// hands WhatsApp a message with the same shape every time, so a thread can actually be counted.
//
// No backend, nothing leaves the phone until the guest presses send: the sheet only composes text.

const MAX = 20;
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

export default function Rsvp({ t, lang, guest, phone, onClose }) {
  const sd = lang === "sd";
  const [going, setGoing] = useState(null);          // null until they choose
  const [count, setCount] = useState(guest ? 1 : 2);
  const [who, setWho] = useState(guest ? guest + "\n" : "");
  const panel = useRef(null);
  const first = useRef(null);

  useEffect(() => {
    document.body.classList.add("lock");
    first.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      // keep the tab ring inside the sheet while it is open
      const f = panel.current?.querySelectorAll("button,textarea,input,[href]");
      if (!f?.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    addEventListener("keydown", onKey);
    return () => { removeEventListener("keydown", onKey); document.body.classList.remove("lock"); };
  }, [onClose]);

  const names = useMemo(
    () => who.split("\n").map((n) => n.trim()).filter(Boolean).slice(0, MAX),
    [who]
  );

  const send = () => {
    buzz(10);
    const text = going ? t.rsvpMsgYes(guest, count, names) : t.rsvpMsgNo(guest);
    open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text), "_blank");
    onClose();
  };

  const step = (by) => {
    buzz(6);
    setCount((c) => Math.min(MAX, Math.max(1, c + by)));
  };

  return (
    <div className="rsvp-veil" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rsvp-sheet" ref={panel} role="dialog" aria-modal="true" aria-label={t.rsvpTitle}>
        <i className="ajrak" />
        <div className="rsvp-in">
          <p className={"rsvp-q" + (sd ? " sd-t" : "")}>{t.rsvpTitle}</p>
          <div className="band" />

          {going === null && (
            <div className="rsvp-pick">
              <button ref={first} className="btn solid" onClick={() => { buzz(8); setGoing(true); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 6 9 17l-5-5" /></svg>
                <span className={sd ? "sd-t" : ""}>{t.rsvpYes}</span>
              </button>
              <button className="btn" onClick={() => { buzz(8); setGoing(false); }}>
                <span className={sd ? "sd-t" : ""}>{t.rsvpNo}</span>
              </button>
            </div>
          )}

          {going === true && (
            <>
              <label className={"rsvp-lab" + (sd ? " sd-t" : "")} htmlFor="rsvp-count">{t.rsvpCount}</label>
              <div className="rsvp-step">
                <button type="button" onClick={() => step(-1)} aria-label="−" disabled={count <= 1}>−</button>
                <output id="rsvp-count">
                  <b>{count}</b>
                  <small className={sd ? "sd-t" : ""}>{count === 1 ? t.rsvpOne : t.rsvpMany}</small>
                </output>
                <button type="button" onClick={() => step(1)} aria-label="+" disabled={count >= MAX}>+</button>
              </div>

              <label className={"rsvp-lab" + (sd ? " sd-t" : "")} htmlFor="rsvp-who">{t.rsvpWho}</label>
              <textarea id="rsvp-who" className={"rsvp-names" + (sd ? " sd-t" : "")} rows={4}
                value={who} onChange={(e) => setWho(e.target.value)} />
              <p className={"rsvp-hint" + (sd ? " sd-t" : "")}>{t.rsvpWhoHint}</p>
            </>
          )}

          {going !== null && (
            <div className="rsvp-acts">
              <button className="btn solid" ref={going === false ? first : null} onClick={send}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 20 18-8L3 4l3 8-3 8Z" /></svg>
                <span className={sd ? "sd-t" : ""}>{t.rsvpSend}</span>
              </button>
              <button className="btn" onClick={() => setGoing(null)}>
                <span className={sd ? "sd-t" : ""}>{t.rsvpBack}</span>
              </button>
            </div>
          )}

          <button className={"rsvp-x" + (sd ? " sd-t" : "")} onClick={onClose}>{t.rsvpClose}</button>
        </div>
      </div>
    </div>
  );
}
