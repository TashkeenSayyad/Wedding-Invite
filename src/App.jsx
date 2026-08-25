import { useEffect, useMemo, useRef, useState } from "react";
import { T, ARABIC_VERSE } from "./i18n.js";
import Intro from "./components/Intro.jsx";
import ScratchHeart from "./components/ScratchHeart.jsx";
import Rsvp from "./components/Rsvp.jsx";
import { watchRsvpQueue } from "./rsvp-store.js";

const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
const RSVP_PHONE = ""; // family WhatsApp number, digits only e.g. "923001234567"
// Google Apps Script web app URL, ending in /exec — see scripts/rsvp-sheet.gs for the five-minute
// setup. Replies queue on the phone and go out when this is filled in; until then WhatsApp carries
// them on its own.
const RSVP_ENDPOINT = "";
const SITE = "https://tashkeensayyad.github.io/Wedding-Invite/";

// Three moments, all Pakistan Standard Time (UTC+5, no daylight saving).
const ARRIVE = new Date("2026-12-27T19:00:00+05:00").getTime(); // guests are seated
const DAY = new Date("2026-12-27T00:00:00+05:00").getTime();    // the wedding day itself
const AFTER = new Date("2026-12-28T06:00:00+05:00").getTime();  // the morning after

// Counts down to 7:00 PM rather than to midnight — running to the top of the day left the
// digits reading 00:00:00:00 from midnight onwards, on the one day everyone opens this.
function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (Date.now() >= DAY) return;                 // nothing left to tick down to
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= DAY) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const t = Math.max(0, ARRIVE - now);
  const p = (n) => String(n).padStart(2, "0");
  return {
    phase: now >= AFTER ? "past" : now >= DAY ? "today" : "before",
    d: Math.floor(t / 864e5),
    h: p(Math.floor(t / 36e5) % 24),
    m: p(Math.floor(t / 6e4) % 60),
    s: p(Math.floor(t / 1e3) % 60),
  };
}

// The Nastaliq face is 160 KB a weight. Only the handful of Sindhi flourishes that show in
// English mode ship up front (as 'Nastaliq Core'); the full cut is fetched the moment a
// reader actually chooses سنڌي.
let sindhiFonts;
const loadSindhiFonts = () => {
  if (sindhiFonts) return sindhiFonts;
  sindhiFonts = (async () => {
    if (!document.fonts || !window.FontFace) return;
    const files = await Promise.all([
      import("./assets/fonts/nastaliq-400.woff2?url"),
      import("./assets/fonts/nastaliq-600.woff2?url"),
    ]);
    await Promise.all(files.map(async (m, i) => {
      const face = new FontFace("Noto Nastaliq Urdu", `url(${m.default}) format("woff2")`,
        { weight: i ? "600" : "400", display: "swap" });
      document.fonts.add(await face.load());
    }));
  })().catch(() => {});
  return sindhiFonts;
};

// RFC 5545 wants CRLF, escaped text and lines folded at 75 octets.
const icsLine = (line) => {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 74) return line;
  const parts = [];
  let cur = "", len = 0;
  for (const ch of line) {                          // by code point, so a character never splits
    const n = enc.encode(ch).length;
    if (len + n > (parts.length ? 73 : 74)) { parts.push(cur); cur = ""; len = 0; }
    cur += ch; len += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
};
const icsText = (v) => String(v).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// `foot` renders outside .inner so it can sit against the section edge, not the content block
function Sec({ id, tone, label, corners = [], children, foot, refMap }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    refMap.current[id] = ref.current;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setInView(true)), { threshold: 0.22 });
    io.observe(ref.current); return () => io.disconnect();
  }, [id, refMap]);
  return (
    <section ref={ref} id={id} data-label={label} className={`sec ${tone}${inView ? " in" : ""}`}>
      {corners.includes("tl") && <i className="corner tl" />}
      {corners.includes("tr") && <i className="corner tr" />}
      {corners.includes("bl") && <i className="corner bl" />}
      {corners.includes("br") && <i className="corner br" />}
      <i className="ajrak" />
      <div className="inner">{children}</div>
      {foot}
      <i className="vig" /><i className="grain" />
    </section>
  );
}

const Rv = ({ d, cls = "", style, children }) => (
  <div className={"rv " + cls} style={{ "--d": d ? d + "s" : undefined, ...style }}>{children}</div>
);

const readLang = () => {
  try {
    const saved = localStorage.getItem("ta-lang");
    if (saved === "en" || saved === "sd") return saved;
  } catch {}
  // only sd — Urdu is close enough to read but it is not the language this was written in
  return /^sd\b/i.test(navigator.language || "") ? "sd" : "en";
};

export default function App() {
  const [lang, setLang] = useState(readLang);
  const [opened, setOpened] = useState(false);
  const [reader, setReader] = useState(false);
  const [active, setActive] = useState("s1");
  const [prog, setProg] = useState(0);
  const [scratched, setScratched] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const t = T[lang];
  const sd = lang === "sd";
  const refMap = useRef({});
  const card3dRef = useRef(null);

  const guest = useMemo(() => {
    const g = new URLSearchParams(location.search).get("to");
    return g ? g.replace(/[<>]/g, "").slice(0, 40) : "";
  }, []);

  useEffect(() => { document.body.classList.toggle("lock", !opened); }, [opened]);

  // anything a previous visit could not deliver goes out now, or when the phone reconnects
  useEffect(() => watchRsvpQueue(RSVP_ENDPOINT), []);

  useEffect(() => {
    try { localStorage.setItem("ta-lang", lang); } catch {}
    document.documentElement.lang = lang;          // so screen readers announce it correctly
    if (sd) loadSindhiFonts();
  }, [lang, sd]);

  useEffect(() => {
    if (!opened) return;
    const ids = ["s1","s2","s3","s4","s5","s6"];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { threshold: 0.55 }
    );
    ids.forEach((i) => refMap.current[i] && io.observe(refMap.current[i]));
    const onScroll = () => {
      const m = document.body.scrollHeight - innerHeight;
      setProg(m > 0 ? (scrollY / m) * 100 : 0);
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); };
  }, [opened]);

  useEffect(() => {
    const el = card3dRef.current;
    if (!el) return;
    const phone = matchMedia("(max-width:430px)").matches;
    const onOri = (e) => {
      const b = Math.max(-26, Math.min(26, (e.beta || 0) - 40));
      const g = Math.max(-26, Math.min(26, e.gamma || 0));
      el.style.setProperty("--cx", (b * 0.18).toFixed(1) + "deg");
      el.style.setProperty("--cy", (g * 0.28).toFixed(1) + "deg");
    };
    const onMove = (e) => {
      el.style.setProperty("--cx", (-(e.clientY / innerHeight - 0.5) * 8).toFixed(1) + "deg");
      el.style.setProperty("--cy", ((e.clientX / innerWidth - 0.5) * 10).toFixed(1) + "deg");
    };
    if (phone && window.DeviceOrientationEvent) addEventListener("deviceorientation", onOri, { passive: true });
    else addEventListener("pointermove", onMove);
    return () => { removeEventListener("deviceorientation", onOri); removeEventListener("pointermove", onMove); };
  }, [opened]);

  const cd = useCountdown();

  const rsvp = () => { buzz(10); setRsvpOpen(true); };
  const ics = () => {
    buzz(10);
    // Times go out in UTC (Pakistan is a flat UTC+5): 7:00 PM PKT is 14:00Z, midnight is 19:00Z.
    const cal = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tashkeen and Anusha//Rukhsati and Walima//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:rukhsati-walima-2026@tashkeen-anusha",
      "DTSTAMP:20260101T000000Z",
      "DTSTART:20261227T140000Z",
      "DTEND:20261227T190000Z",
      "SEQUENCE:0",
      "STATUS:CONFIRMED",
      "SUMMARY:" + icsText(t.calSummary),
      "LOCATION:" + icsText("Nerunkot Hall, Qasimabad, Hyderabad, Sindh"),
      "DESCRIPTION:" + icsText(t.calDesc),
      "URL:" + SITE,
      "BEGIN:VALARM",                               // the day before, given the road on the 27th
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + icsText(t.calSummary),
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].map(icsLine).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([cal], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "tashkeen-anusha.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const dotIds = ["s1","s2","s3","s4","s5","s6"];

  return (
    <>
      <Intro t={t} lang={lang} guest={guest} onOpened={() => { setOpened(true); scrollTo(0, 0); }} />

      <div className="thread"><i style={{ height: prog + "%" }} /></div>

      <nav className={"dots" + (opened ? " show" : "")} aria-label="Sections">
        {dotIds.map((id) => (
          <a key={id} href={"#" + id} data-l={t.dotLabels[id]} className={active === id ? "on" : ""} aria-label={t.dotLabels[id]} />
        ))}
      </nav>

      <div className="topbar show">
        <button className="pill" onPointerEnter={loadSindhiFonts}
          onClick={() => { setLang(sd ? "en" : "sd"); buzz(8); }}>{sd ? "English" : "سنڌي"}</button>
      </div>

      {rsvpOpen && (
        <Rsvp t={t} lang={lang} guest={guest} phone={RSVP_PHONE} endpoint={RSVP_ENDPOINT}
          onClose={() => setRsvpOpen(false)} />
      )}

      <div id="reader" className={reader ? "on" : ""} onClick={() => setReader(false)}>
        <span className={"x" + (sd ? " sd-t" : "")}>{t.tapClose}</span>
        {reader && <img src="./assets/card-print.png" alt="Rukhsati & Walima invitation card" />}
      </div>

      <main>
        {/* 1 · card */}
        <Sec id="s1" tone="wine" label={t.dotLabels.s1} refMap={refMap}
          foot={<div className={"cue" + (sd ? " sd-t" : "")}>{t.scroll}
            <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </div>}>
          <Rv cls="cardwrap" style={{ cursor: "zoom-in" }}>
            <div onClick={() => { setReader(true); buzz(8); }} style={{ position: "absolute", inset: 0, zIndex: 6 }} />
            <div className="card3d" ref={card3dRef}><div className="cardimg" /></div>
            <i className="gilt" />
            <span className={"zoomhint" + (sd ? " sd-t" : "")}>{t.tapRead}</span>
          </Rv>
          <div className="names">
            <Rv d={0.25} cls="nm-sd">تاشقين ۽ انوشا</Rv>
          </div>
        </Sec>

        {/* 2 · verse */}
        <Sec id="s2" tone="deep" label={t.dotLabels.s2} corners={["tl","tr","bl","br"]} refMap={refMap}>
          <Rv cls="star" />
          <Rv d={0.06} cls={"kicker" + (sd ? " sd-t" : "")} style={{ marginTop: 14 }}>{t.verseKicker}</Rv>
          <Rv d={0.14} cls="arab">{ARABIC_VERSE}</Rv>
          <Rv d={0.22} cls="translit">{t.translit}</Rv>
          <Rv d={0.26} cls="band" />
          <Rv d={0.3} cls={"body" + (sd ? " sd-t" : "")} style={{ fontStyle: sd ? "normal" : "italic" }}>{t.verse}</Rv>
          <Rv d={0.4} cls="kicker" style={{ marginTop: 12 }}>{t.verseRef}</Rv>
          <Rv d={0.5} cls={"body" + (sd ? " sd-t" : "")} style={{ marginTop: 20, fontSize: 12.5 }}>{t.verseNote}</Rv>
        </Sec>

        {/* 3 · countdown + scratch heart */}
        <Sec id="s3" tone="deep" label={t.dotLabels.s3} refMap={refMap}>
          <Rv cls={"kicker" + (sd ? " sd-t" : "")}>{t.saveDate}</Rv>
          <Rv d={0.12} cls={"body" + (sd ? " sd-t" : "")} style={{ marginTop: 10, maxWidth: 310, marginInline: "auto" }}>{t.scratchTease}</Rv>
          <Rv d={0.2}>
            <ScratchHeart t={t} lang={lang} onDone={() => setScratched(true)} />
          </Rv>
          <div className={"cd-wrap" + (scratched ? " show" : "")} aria-hidden={!scratched}>
            <div className="cd-inner">
              <p className={"big cd-big" + (sd ? " sd-t" : "")}>
                {cd.phase === "before" ? t.dateBig : cd.phase === "today" ? t.today : t.past}
              </p>
              <p className={"body cd-sub" + (sd ? " sd-t" : "")}>
                {cd.phase === "before" ? t.venueLine : cd.phase === "today" ? t.todayNote : t.pastNote}
              </p>
              {cd.phase === "before" && (
                <div className="cd">
                  {[cd.d, cd.h, cd.m, cd.s].map((v, i) => (
                    <div key={i}><b>{v}</b><small className={sd ? "sd-t" : ""}>{t.labels[i]}</small></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Sec>

        {/* 4 · schedule */}
        <Sec id="s4" tone="wine" label={t.dotLabels.s4} corners={["tr","bl"]} refMap={refMap}>
          <Rv cls={"kicker" + (sd ? " sd-t" : "")}>{t.schedKicker}</Rv>
          <Rv d={0.05} cls={"script h-lg" + (sd ? " sd-t" : "")}>{sd ? t.schedTitle : "Schedule"}</Rv>
          <Rv d={0.1} cls="band" />
          <ol className="sched">
            {t.sched.map(([time, what], i) => (
              <Rv key={i} d={0.16 + i * 0.06}>
                <li className={i === t.sched.length - 1 ? "last" : ""}>
                  <b>{time}</b><span className={sd ? "sd-t" : ""}>{what}</span>
                </li>
              </Rv>
            ))}
          </ol>
          <Rv d={0.48} cls="notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="12" r="9" /><path d="M12 7v6l3.5 2" /></svg>
            <p className={sd ? "sd-t" : ""}><b>{t.noticeB}</b>{t.notice}</p>
          </Rv>
          <Rv d={0.55} cls="gtk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M5 11h14M5 11v6h2v2h2v-2h6v2h2v-2h2v-6" /><circle cx="8" cy="14.5" r="1" /><circle cx="16" cy="14.5" r="1" /></svg>
            <p className={sd ? "sd-t" : ""}><b>{t.parkB}</b>{t.park}</p>
          </Rv>
          <Rv d={0.62} cls="gtk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 19h16M7 19V9l5-5 5 5v10M10 19v-5h4v5" /></svg>
            <p className={sd ? "sd-t" : ""}><b>{t.travelB}</b>{t.travel}</p>
          </Rv>
          <div className="acts">
            <button className="btn solid" onClick={rsvp}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 6 9 17l-5-5" /></svg>
              <span className={sd ? "sd-t" : ""}>{t.rsvp}</span></button>
            <button className="btn" onClick={ics}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
              <span className={sd ? "sd-t" : ""}>{t.calendar}</span></button>
            <a className="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=Nerunkot%20Hall%20Qasimabad%20Hyderabad">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              <span className={sd ? "sd-t" : ""}>{t.map}</span></a>
            <a className="btn" href="./assets/card-print.png" download="rukhsati-walima-tashkeen-anusha.png" onClick={() => buzz(10)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 3v12M8 11l4 4 4-4M4 19h16" /></svg>
              <span className={sd ? "sd-t" : ""}>{t.save}</span></a>
          </div>
        </Sec>

        {/* 5 · dress code */}
        <Sec id="s5" tone="wine" label={t.dotLabels.s5} corners={["tr","bl"]} refMap={refMap}>
          <Rv cls={"kicker" + (sd ? " sd-t" : "")}>{t.dressKicker}</Rv>
          <Rv d={0.05} cls={"h-caps" + (sd ? " sd-t" : "")}>{t.dressTitle}</Rv>
          <Rv d={0.1} cls="band" />
          <div className="dc">
            <Rv d={0.16}>
              <h3 className={sd ? "sd-t" : ""} style={{ fontFamily: "var(--fc)", fontSize: sd ? 14 : 11.5, letterSpacing: sd ? 0 : ".2em", textTransform: "uppercase", color: "var(--gold-p)", fontWeight: 600, marginBottom: 10 }}>{t.encouraged}</h3>
              <div className="chips">
                {t.colors.map(([c, n], i) => (
                  <span key={i} className="chip"><i style={{ background: c }} /><span className={sd ? "sd-t" : ""}>{n}</span></span>
                ))}
              </div>
            </Rv>
            <Rv d={0.24}>
              <h3 className={sd ? "sd-t" : ""} style={{ fontFamily: "var(--fc)", fontSize: sd ? 14 : 11.5, letterSpacing: sd ? 0 : ".2em", textTransform: "uppercase", color: "var(--gold-p)", fontWeight: 600, marginBottom: 10 }}>{t.reserved}</h3>
              <div className="chips">
                {t.resChips.map(([c, n], i) => (
                  <span key={i} className="chip no"><i style={{ background: c }} /><span className={sd ? "sd-t" : ""}>{n}</span></span>
                ))}
              </div>
            </Rv>
          </div>
          <Rv d={0.32} cls={"body" + (sd ? " sd-t" : "")} style={{ marginTop: 20, fontStyle: sd ? "normal" : "italic" }}>{t.dressNote}</Rv>
        </Sec>

        {/* 6 · closing */}
        <Sec id="s6" tone="deep" label={t.dotLabels.s6} corners={["tl","tr","bl","br"]} refMap={refMap}>
          <Rv cls="star" />
          {!sd && <Rv d={0.12} cls="sdt" style={{ fontSize: 17, marginTop: 14 }}>{t.closeSd}</Rv>}
          <Rv d={0.2} cls={"script" + (sd ? " sd-t" : "")} style={{ fontSize: sd ? "clamp(26px,7vw,34px)" : "clamp(28px,7.6vw,36px)" }}>{t.closeTitle}</Rv>
          <Rv d={0.26} cls="band" />
          <Rv d={0.32} cls="kicker">Tashkeen &amp; Anusha</Rv>
          <Rv d={0.4} cls={"body" + (sd ? " sd-t" : "")} style={{ marginTop: 20, maxWidth: 300, marginInline: "auto" }}>{t.closeNote}</Rv>
          {guest && <Rv d={0.5} cls={"sig" + (sd ? " sd-t" : "")}>{t.closeGuest(guest)}</Rv>}
        </Sec>
      </main>
    </>
  );
}
