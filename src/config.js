// Everything the family might need to change, in one file.
//
// Two of these are still blank and are the only things standing between the invitation and a
// working RSVP: RSVP_PHONE and RSVP_ENDPOINT. Fill them in below, or — if you would rather not
// edit source at all — put them in a .env file next to package.json and rebuild:
//
//     VITE_RSVP_PHONE=923001234567
//     VITE_RSVP_ENDPOINT=https://script.google.com/macros/s/AKfy…/exec
//
// The .env values win when they are set, so the same source can build a real site and a test one.
// `npm run check` will tell you which of the two are still missing.

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
const pick = (v, fallback) => (typeof v === "string" && v.trim() ? v.trim() : fallback);

/** Family WhatsApp number, digits only, with country code and no +, e.g. "923001234567".
 *  Left empty, the RSVP still composes its message but WhatsApp asks the guest to pick a
 *  contact — so replies arrive addressed to nobody. */
export const RSVP_PHONE = pick(env.VITE_RSVP_PHONE, "").replace(/[^0-9]/g, "");

/** Google Apps Script web app URL, ending in /exec. See scripts/rsvp-sheet.gs for the setup.
 *  Left empty, replies queue on each guest's phone and only WhatsApp carries them. */
export const RSVP_ENDPOINT = pick(env.VITE_RSVP_ENDPOINT, "");

/** Where the invitation lives. Used by the guest-link generator, the QR code and the .ics. */
export const SITE = pick(env.VITE_SITE, "https://tashkeensayyad.github.io/Wedding-Invite/");

/** Optional. A date by which the family would like to hear back, as a plain string in each
 *  language — the line only appears once both are filled in, so an unset deadline shows nothing
 *  rather than an empty promise. e.g. { en: "13 December 2026", sd: "13 ڊسمبر 2026" } */
export const RSVP_BY = { en: "", sd: "" };

// ── The event itself ───────────────────────────────────────────────────────────────────────
// Pakistan is a flat UTC+5 with no daylight saving, so these are unambiguous.

export const VENUE = "Nerunkot Hall, Qasimabad, Hyderabad, Sindh";
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Nerunkot Hall Qasimabad Hyderabad");

/** Guests are seated. The countdown runs to this, not to midnight — running to the top of the
 *  day left the digits at 00:00:00:00 from midnight onwards, on the one day everyone opens this. */
export const ARRIVE = new Date("2026-12-27T19:00:00+05:00").getTime();
/** The wedding day itself, from midnight. */
export const DAY = new Date("2026-12-27T00:00:00+05:00").getTime();
/** The morning after, when the invitation starts thanking people instead of counting. */
export const AFTER = new Date("2026-12-28T06:00:00+05:00").getTime();

/** The evening, in UTC, for the calendar entry: 7:00 PM PKT is 14:00Z, midnight is 19:00Z. */
export const ICS_START = "20261227T140000Z";
export const ICS_END = "20261227T190000Z";
/** Stable across rebuilds, so a guest who adds the event twice updates it rather than doubling it. */
export const ICS_UID = "rukhsati-walima-2026@tashkeen-anusha";

/** Google Calendar takes the same two instants in the same format. Built here so the two
 *  calendar routes can never drift apart. */
export const GCAL_URL = (summary, details) =>
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&dates=" + ICS_START + "/" + ICS_END +
  "&text=" + encodeURIComponent(summary) +
  "&details=" + encodeURIComponent(details + "\n\n" + SITE) +
  "&location=" + encodeURIComponent(VENUE) +
  "&ctz=Asia/Karachi";
