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

// ── The two evenings ────────────────────────────────────────────────────────────────────────
// Pakistan is a flat UTC+5 with no daylight saving, so these are unambiguous.
//
// The Rukhsati is on Sunday 27 December in Hyderabad; the Walima follows on Tuesday 29 December in
// Thatta. The Walima's time is not fixed yet — until it is, the calendar carries it as an all-day
// entry and the page gives its date and hall with no hour. When the family sets one, fill in
// WALIMA_ICS_START / WALIMA_ICS_END below (UTC, like the Rukhsati's) and the calendar picks it up.

export const VENUE = "Nerunkot Hall, Qasimabad, Hyderabad, Sindh";
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Nerunkot Hall Qasimabad Hyderabad");

export const WALIMA_VENUE = "Zam Zam Hall, Thatta, Sindh";
export const WALIMA_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Zam Zam Hall Thatta");

/** Guests are seated for the Rukhsati. The countdown runs to this, not to midnight — running to
 *  the top of the day left the digits at 00:00:00:00 from midnight onwards, on the one day
 *  everyone opens this. */
export const ARRIVE = new Date("2026-12-27T19:00:00+05:00").getTime();
/** The Rukhsati day itself, from midnight. */
export const DAY = new Date("2026-12-27T00:00:00+05:00").getTime();
/** The morning after the Rukhsati, when the page turns to the Walima. */
export const BETWEEN = new Date("2026-12-28T06:00:00+05:00").getTime();
/** The Walima day, from midnight. */
export const WALIMA_DAY = new Date("2026-12-29T00:00:00+05:00").getTime();
/** The morning after the Walima, when the invitation starts thanking people instead of counting. */
export const AFTER = new Date("2026-12-30T06:00:00+05:00").getTime();

/** The Rukhsati, in UTC, for the calendar entry: 7:00 PM PKT is 14:00Z, midnight is 19:00Z. */
export const ICS_START = "20261227T140000Z";
export const ICS_END = "20261227T190000Z";
/** Stable across rebuilds, so a guest who adds the event twice updates it rather than doubling it.
 *  It predates the Walima having an entry of its own, which is why it still names both. */
export const ICS_UID = "rukhsati-walima-2026@tashkeen-anusha";

/** The Walima. Empty until its time is fixed; the calendar then files it as an all-day entry on
 *  WALIMA_DATE. Fill both with UTC stamps like the two above once the family has an hour. */
export const WALIMA_DATE = "20261229";
export const WALIMA_ICS_START = "";
export const WALIMA_ICS_END = "";
export const WALIMA_ICS_UID = "walima-2026@tashkeen-anusha";

/** "20261229" → "20261230". An all-day entry ends on the day after, exclusive. */
export const nextDate = (d) =>
  new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8) + 1))
    .toISOString().slice(0, 10).replace(/-/g, "");

/** Google Calendar takes the same instants in the same format. Built here so the two calendar
 *  routes can never drift apart. An all-day entry is a pair of dates, the end exclusive. */
const gcal = (dates, location) => (summary, details) =>
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&dates=" + dates +
  "&text=" + encodeURIComponent(summary) +
  "&details=" + encodeURIComponent(details + "\n\n" + SITE) +
  "&location=" + encodeURIComponent(location) +
  "&ctz=Asia/Karachi";

export const GCAL_URL = gcal(ICS_START + "/" + ICS_END, VENUE);
export const WALIMA_GCAL_URL = gcal(
  WALIMA_ICS_START && WALIMA_ICS_END
    ? WALIMA_ICS_START + "/" + WALIMA_ICS_END
    : WALIMA_DATE + "/" + nextDate(WALIMA_DATE),
  WALIMA_VENUE);
