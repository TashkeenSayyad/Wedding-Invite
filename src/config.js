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

// ── Which family is inviting ─────────────────────────────────────────────────────────────────
// The same invitation is published twice. The site itself is the groom's family's — Jallal Hyder
// & Rubina invite you, and Tashkeen is named first. /bridal/ is the bride's family's — Barkat Ali
// & Mumtaz invite you, and Anusha is named first, on the card and everywhere the couple is named.
// bridal/index.html marks itself with data-side="bridal" (it is generated from index.html by
// scripts/bridal-html.mjs); in Node, where there is no page, this is always the groom's side.
export const SIDE =
  typeof document !== "undefined" && document.documentElement.dataset.side === "bridal" ? "bridal" : "groom";
export const BRIDAL = SIDE === "bridal";
/** The site's root, relative to the page: public files (the print card, the song, sw.js) live
 *  there for both sides, and the bridal page is one folder down. */
export const ROOT_PATH = BRIDAL ? "../" : "./";
/** The couple, in the order this side names them. */
export const COUPLE = BRIDAL
  ? { en: "Anusha & Tashkeen", sd: "انوشا ۽ تاشقين" }
  : { en: "Tashkeen & Anusha", sd: "تاشقين ۽ انوشا" };

/** Family WhatsApp number, digits only, with country code and no +, e.g. "923001234567".
 *  Left empty, the RSVP still composes its message but WhatsApp asks the guest to pick a
 *  contact — so replies arrive addressed to nobody. */
export const RSVP_PHONE_GROOM = pick(env.VITE_RSVP_PHONE, "").replace(/[^0-9]/g, "");
/** The bride's family's number, for replies to the /bridal/ invitation. Left empty, those replies
 *  go to RSVP_PHONE_GROOM instead. */
export const RSVP_PHONE_BRIDAL = pick(env.VITE_RSVP_PHONE_BRIDAL, "").replace(/[^0-9]/g, "");
export const RSVP_PHONE = (BRIDAL && RSVP_PHONE_BRIDAL) || RSVP_PHONE_GROOM;

/** Google Apps Script web app URL, ending in /exec. See scripts/rsvp-sheet.gs for the setup.
 *  Left empty, replies queue on each guest's phone and only WhatsApp carries them. */
export const RSVP_ENDPOINT_GROOM = pick(env.VITE_RSVP_ENDPOINT, "");
/** The bride's family's Sheet, if they keep their own. Left empty, /bridal/ replies go to the same
 *  Sheet as the groom's side. */
export const RSVP_ENDPOINT_BRIDAL = pick(env.VITE_RSVP_ENDPOINT_BRIDAL, "");
export const RSVP_ENDPOINT = (BRIDAL && RSVP_ENDPOINT_BRIDAL) || RSVP_ENDPOINT_GROOM;

/** Where the invitation lives. Used by the guest-link generator, the QR code and the .ics. */
export const SITE = pick(env.VITE_SITE, "https://tashkeensayyad.github.io/Wedding-Invite/");
/** This side's own page: the site for the groom's family, SITE + "bridal/" for the bride's. */
export const PAGE_URL = SITE + (BRIDAL ? "bridal/" : "");

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
  "&details=" + encodeURIComponent(details + "\n\n" + PAGE_URL) +
  "&location=" + encodeURIComponent(VENUE) +
  "&ctz=Asia/Karachi";

// ── Music ──────────────────────────────────────────────────────────────────────────────────
/** The song that starts when a guest taps the seal and plays on a loop while they read.
 *  Drop the file at public/assets/music.mp3 — until it is there nothing plays and no mute
 *  control appears, so the invitation works the same with or without it. Encode it small:
 *  ffmpeg -i song.mp3 -ac 2 -b:a 96k -map_metadata -1 public/assets/music.mp3
 *  (about 0.7 MB a minute). The credit is read aloud on the mute control. */
export const MUSIC = {
  src: ROOT_PATH + "assets/music.mp3",
  credit: "Alfaaz · instrumental",
};
