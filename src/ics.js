// The calendar entry, built to RFC 5545 rather than to what usually works.
//
// It lives in its own file so `npm run check` can build one and read it back — folding, escaping
// and CRLF endings are exactly the sort of thing that is invisible until a guest's phone quietly
// refuses the file, and by then the invitation has already gone out.
import { ICS_END, ICS_START, ICS_UID, SITE, VENUE } from "./config.js";

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

/** The whole calendar, in the reader's own language. Times go out in UTC — Pakistan is a flat
 *  UTC+5 — which is what lets this carry no VTIMEZONE at all. */
export const buildIcs = (t) => [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Tashkeen and Anusha//Rukhsati and Walima//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "BEGIN:VEVENT",
  "UID:" + ICS_UID,
  "DTSTAMP:20260101T000000Z",
  "DTSTART:" + ICS_START,
  "DTEND:" + ICS_END,
  "SEQUENCE:0",
  "STATUS:CONFIRMED",
  "SUMMARY:" + icsText(t.calSummary),
  "LOCATION:" + icsText(VENUE),
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
