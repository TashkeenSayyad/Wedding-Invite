import { useEffect, useMemo, useRef, useState } from "react";
import { flushRsvps, lastRsvp, newRsvpId, queueRsvp } from "../rsvp-store.js";
import { RSVP_BY } from "../config.js";
import Sheet from "./Sheet.jsx";

// A WhatsApp link cannot give the family a headcount, and free-text replies arrive in twenty
// different shapes. This sheet asks the questions that matter — how many, who, and anything they
// want to say — then sends the answer two ways: as a row in the family's Google Sheet, and as a
// WhatsApp message with the same shape every time.
//
// Both, deliberately. The Sheet is what you count from; WhatsApp is what arrives on a phone the
// moment a guest replies, and it is what still works when the Sheet cannot be reached.
//
// A guest who has replied before is shown their own answer rather than an empty form. Changing it
// reuses the id their phone generated the first time, which the Apps Script matches on and
// overwrites — so remembering a cousin an hour later corrects one row instead of adding a second.

const MAX = 20;
const MAX_NOTE = 500;
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

export default function Rsvp({ t, lang, guest, phone, endpoint, onClose }) {
  const sd = lang === "sd";
  const prev = useMemo(() => lastRsvp(), []);
  const [screen, setScreen] = useState(prev ? "again" : "pick");
  const [going, setGoing] = useState(null);          // null until they choose
  const [sent, setSent] = useState(false);
  const [queued, setQueued] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [count, setCount] = useState(guest ? 1 : 2);
  const [who, setWho] = useState(guest ? guest + "\n" : "");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const first = useRef(null);

  // Sheet focuses the first control on mount; this follows it as the panel changes shape, so
  // answering "joyfully attending" lands the reader on the counter rather than back at the top.
  useEffect(() => { first.current?.focus(); }, [screen, going, sent]);

  const names = useMemo(
    () => who.split("\n").map((n) => n.trim()).filter(Boolean).slice(0, MAX),
    [who]
  );

  // Their earlier answer, put back in front of them to edit rather than retyped from nothing.
  const amend = () => {
    buzz(8);
    setUpdating(true);
    setGoing(prev.attending === "yes");
    if (prev.count) setCount(Math.min(MAX, Math.max(1, Number(prev.count) || 1)));
    if (prev.names) setWho(prev.names.split(", ").join("\n") + "\n");
    if (prev.note) setNote(prev.note);
    if (prev.contact) setContact(prev.contact);
    setScreen("pick");
  };

  const send = () => {
    buzz(10);
    const trimmed = note.trim().slice(0, MAX_NOTE);
    // Stored before anything that can fail is attempted, so a dropped connection cannot lose it.
    queueRsvp({
      id: updating ? prev.id : newRsvpId(),
      invitation: guest || "",
      attending: going ? "yes" : "no",
      count: going ? count : 0,
      names: going ? names.join(", ") : "",
      note: trimmed,
      contact: contact.trim().slice(0, 40),
      lang,
    });
    // Opened straight from the click, before the await below — a popup that comes later is blocked.
    const text = going
      ? t.rsvpMsgYes(guest, count, names, trimmed, updating)
      : t.rsvpMsgNo(guest, trimmed, updating);
    open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text), "_blank");
    flushRsvps(endpoint);                            // retried on the next visit if it does not land
    setQueued(navigator.onLine === false);
    setSent(true);
  };

  const step = (by) => {
    buzz(6);
    setCount((c) => Math.min(MAX, Math.max(1, c + by)));
  };

  const by = RSVP_BY[lang] || "";
  const title = sent ? t.rsvpThanks : screen === "again" ? t.rsvpAgain : t.rsvpTitle;

  return (
    <Sheet label={t.rsvpTitle} onClose={onClose}>
      <p className={"rsvp-q" + (sd ? " sd-t" : "")}>{title}</p>
      <div className="band" />

      {sent && (
        <>
          <div className="rsvp-tick" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <p className={"body" + (sd ? " sd-t" : "")} role="status">
            {queued ? t.rsvpQueued : t.rsvpSent}
          </p>
        </>
      )}

      {/* they have replied from this phone before — their own answer, not an empty form */}
      {!sent && screen === "again" && (
        <>
          <p className={"body" + (sd ? " sd-t" : "")}>
            {prev.attending === "yes" ? t.rsvpAgainYes(prev.count) : t.rsvpAgainNo}
          </p>
        </>
      )}

      {!sent && screen === "pick" && going === null && (
        <div className="rsvp-pick">
          <button ref={first} className="btn solid" onClick={() => { buzz(8); setGoing(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 6 9 17l-5-5" /></svg>
            <span className={sd ? "sd-t" : ""}>{t.rsvpYes}</span>
          </button>
          <button className="btn" onClick={() => { buzz(8); setGoing(false); }}>
            <span className={sd ? "sd-t" : ""}>{t.rsvpNo}</span>
          </button>
          {by && <p className={"rsvp-hint" + (sd ? " sd-t" : "")}>{t.rsvpBy(by)}</p>}
        </div>
      )}

      {!sent && screen === "pick" && going === true && (
        <>
          <label className={"rsvp-lab" + (sd ? " sd-t" : "")} htmlFor="rsvp-count">{t.rsvpCount}</label>
          <div className="rsvp-step">
            <button type="button" ref={first} onClick={() => step(-1)} aria-label="−" disabled={count <= 1}>−</button>
            <output id="rsvp-count">
              <b>{count}</b>
              <small className={sd ? "sd-t" : ""}>{count === 1 ? t.rsvpOne : t.rsvpMany}</small>
            </output>
            <button type="button" onClick={() => step(1)} aria-label="+" disabled={count >= MAX}>+</button>
          </div>

          <label className={"rsvp-lab" + (sd ? " sd-t" : "")} htmlFor="rsvp-who">{t.rsvpWho}</label>
          <textarea id="rsvp-who" className={"rsvp-names" + (sd ? " sd-t" : "")} rows={3}
            value={who} onChange={(e) => setWho(e.target.value)} />
          <p className={"rsvp-hint" + (sd ? " sd-t" : "")}>{t.rsvpWhoHint}</p>
        </>
      )}

      {/* asked of everyone, including the guests who cannot come — a regret often carries the
          kindest thing anyone writes all week */}
      {!sent && screen === "pick" && going !== null && (
        <>
          <label className={"rsvp-lab" + (sd ? " sd-t" : "")} htmlFor="rsvp-note">{t.rsvpNote}</label>
          <textarea id="rsvp-note" className={"rsvp-names" + (sd ? " sd-t" : "")} rows={2}
            maxLength={MAX_NOTE} placeholder={t.rsvpNotePh}
            value={note} onChange={(e) => setNote(e.target.value)} />

          <label className={"rsvp-lab" + (sd ? " sd-t" : "")} htmlFor="rsvp-contact">{t.rsvpContact}</label>
          <input id="rsvp-contact" className="rsvp-names rsvp-one" type="tel" inputMode="tel"
            autoComplete="tel" maxLength={40} dir="ltr"
            value={contact} onChange={(e) => setContact(e.target.value)} />

        </>
      )}

      {/* Sticky, because the form is taller than a 360px phone in Sindhi and a send button a
          guest has to go looking for is a guest who does not reply. The fields scroll under it. */}
      <div className="rsvp-foot">
        {!sent && screen === "again" && (
          <div className="rsvp-acts">
            <button className="btn solid" ref={first} onClick={amend}>
              <span className={sd ? "sd-t" : ""}>{t.rsvpUpdate}</span>
            </button>
            <button className="btn" onClick={onClose}>
              <span className={sd ? "sd-t" : ""}>{t.rsvpKeep}</span>
            </button>
          </div>
        )}
        {!sent && screen === "pick" && going !== null && (
          <div className="rsvp-acts">
            <button className="btn solid" onClick={send}>
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
    </Sheet>
  );
}
