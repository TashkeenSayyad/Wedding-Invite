// The calendar entry, built to RFC 5545 rather than to what usually works.
//
// It lives in its own file so `npm run check` can build one and read it back — folding, escaping
// and CRLF endings are exactly the sort of thing that is invisible until a guest's phone quietly
// refuses the file, and by then the invitation has already gone out.
import {
  ICS_END, ICS_START, ICS_UID, SITE, VENUE,
  WALIMA_DATE, WALIMA_ICS_END, WALIMA_ICS_START, WALIMA_ICS_UID, WALIMA_VENUE, nextDate,
} from "./config.js";

// RFC 5545 wants CRLF, escaped text and lines folded at 75 octets.
export const icsLine = (line) => {
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

export const icsText = (v) =>
  String(v).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// The Walima has no hour yet, so until WALIMA_ICS_START is set it is an all-day entry: a DATE,
// which is floating by definition and needs no VTIMEZONE either. Its reminder is set for 9:00 AM
// the day before rather than the midnight a one-day trigger would land on.
const walimaWhen = () => WALIMA_ICS_START && WALIMA_ICS_END
  ? ["DTSTART:" + WALIMA_ICS_START, "DTEND:" + WALIMA_ICS_END, "TRIGGER:-P1D"]
  : ["DTSTART;VALUE=DATE:" + WALIMA_DATE, "DTEND;VALUE=DATE:" + nextDate(WALIMA_DATE), "TRIGGER:-PT15H"];

const event = ({ uid, start, end, trigger, summary, location, desc }) => [
  "BEGIN:VEVENT",
  "UID:" + uid,
  "DTSTAMP:20260101T000000Z",
  start,
  end,
  "SEQUENCE:0",
  "STATUS:CONFIRMED",
  "SUMMARY:" + icsText(summary),
  "LOCATION:" + icsText(location),
  "DESCRIPTION:" + icsText(desc),
  "URL:" + SITE,
  "BEGIN:VALARM",
  trigger,
  "ACTION:DISPLAY",
  "DESCRIPTION:" + icsText(summary),
  "END:VALARM",
  "END:VEVENT",
];

/** The whole calendar, both evenings, in the reader's own language. Timed entries go out in UTC —
 *  Pakistan is a flat UTC+5 — which is what lets this carry no VTIMEZONE at all. */
export const buildIcs = (t) => {
  const [wStart, wEnd, wTrigger] = walimaWhen();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tashkeen and Anusha//Rukhsati and Walima//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...event({                                  // reminded the day before, given the road on the 27th
      uid: ICS_UID, start: "DTSTART:" + ICS_START, end: "DTEND:" + ICS_END, trigger: "TRIGGER:-P1D",
      summary: t.calRukhsati, location: VENUE, desc: t.calDesc,
    }),
    ...event({
      uid: WALIMA_ICS_UID, start: wStart, end: wEnd, trigger: wTrigger,
      summary: t.calWalima, location: WALIMA_VENUE, desc: t.calWalimaDesc,
    }),
    "END:VCALENDAR",
  ].map(icsLine).join("\r\n") + "\r\n";
};
