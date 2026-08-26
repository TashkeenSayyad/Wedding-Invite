// The invariants this project keeps breaking, checked by a machine instead of by eye.
//
//   npm run check
//
// It runs before every build. Three of the four things it looks for have already shipped broken
// at least once: a Sindhi string that outlived its English twin, a key referenced in a component
// and defined in only one language, and an .ics that a phone would have refused. The fourth —
// telling you which settings are still blank — is the difference between an RSVP button that
// works and one that opens WhatsApp's contact picker.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { T } from "../src/i18n.js";
import { buildIcs } from "../src/ics.js";
import { RSVP_ENDPOINT, RSVP_PHONE, SITE } from "../src/config.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

/* ── 1 · the two languages must be the same shape ───────────────────────────── */

const shape = (v) => Array.isArray(v) ? "array" : typeof v;
const walk = (a, b, path = "") => {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const k of keys) {
    const at = path ? `${path}.${k}` : k;
    if (!(k in a)) { fail(`i18n: "${at}" is in sd but not en`); continue; }
    if (!(k in b)) { fail(`i18n: "${at}" is in en but not sd`); continue; }
    if (shape(a[k]) !== shape(b[k])) {
      fail(`i18n: "${at}" is a ${shape(a[k])} in en and a ${shape(b[k])} in sd`);
      continue;
    }
    if (Array.isArray(a[k])) {
      if (a[k].length !== b[k].length) {
        fail(`i18n: "${at}" has ${a[k].length} entries in en and ${b[k].length} in sd`);
      }
      // the schedule is pairs of [time, what]; the times themselves must not drift apart
      a[k].forEach((row, i) => {
        if (Array.isArray(row) && Array.isArray(b[k][i]) && row.length !== b[k][i].length) {
          fail(`i18n: "${at}[${i}]" has a different width in en and sd`);
        }
      });
    } else if (shape(a[k]) === "object") {
      walk(a[k], b[k], at);
    }
  }
};
walk(T.en, T.sd);

// A string cleared in one language and left asserting itself in the other has happened twice: a
// dress-code chip that lived on in Sindhi, and a nikkah note that kept shipping after the English
// had been retracted. Anything genuinely one-sided has to say why it is here.
const ONE_SIDED = {
  // The Sindhi flourish over the English farewell. In Sindhi the heading already *is* this
  // phrase, so printing it again above itself would say it twice.
  closeSd: "en",
};
for (const k of Object.keys(T.en)) {
  if (typeof T.en[k] !== "string") continue;
  const en = T.en[k].trim(), sd = (T.sd[k] || "").trim();
  if (!en && sd && ONE_SIDED[k] !== "sd") fail(`i18n: "${k}" is empty in en but still says something in sd`);
  if (en && !sd && ONE_SIDED[k] !== "en") fail(`i18n: "${k}" is empty in sd but still says something in en`);
}

/* ── 2 · every key the components reach for, and nothing they never do ──────── */

const files = ["src/App.jsx", "src/main.jsx", "src/ics.js",
  ...readdirSync(resolve(root, "src/components")).map((f) => `src/components/${f}`)];
const code = files.map((f) => readFileSync(resolve(root, f), "utf8")).join("\n");

const used = new Set([...code.matchAll(/\bt\.([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1]));
for (const k of used) {
  if (!(k in T.en)) fail(`i18n: components use t.${k}, which no language defines`);
}
// dotLabels is reached as t.dotLabels[id] and t.dotLabels.s1, so its members are counted here
const reachedIndirectly = new Set(["dotLabels"]);
for (const k of Object.keys(T.en)) {
  if (!used.has(k) && !reachedIndirectly.has(k)) {
    warn(`i18n: "${k}" is defined in both languages but nothing renders it`);
  }
}

/* ── 3 · the .ics has to survive a phone ────────────────────────────────────── */

for (const lang of ["en", "sd"]) {
  const cal = buildIcs(T[lang]);
  const where = `.ics (${lang})`;
  if (!cal.endsWith("\r\n")) fail(`${where}: does not end with CRLF`);
  if (/[^\r]\n/.test(cal)) fail(`${where}: has a bare LF somewhere`);

  const lines = cal.split("\r\n").slice(0, -1);
  const enc = new TextEncoder();
  lines.forEach((l, i) => {
    if (enc.encode(l).length > 75) fail(`${where}: line ${i + 1} is ${enc.encode(l).length} octets, over the 75 limit`);
  });
  // a continuation line is the only one allowed to start with a space
  lines.forEach((l, i) => {
    if (i && !l.startsWith(" ") && !/^[A-Z-]+[;:]/.test(l)) fail(`${where}: line ${i + 1} is neither a property nor a fold: ${l.slice(0, 24)}`);
  });

  const unfolded = cal.replace(/\r\n /g, "");
  for (const [open, close] of [["BEGIN:VCALENDAR", "END:VCALENDAR"], ["BEGIN:VEVENT", "END:VEVENT"], ["BEGIN:VALARM", "END:VALARM"]]) {
    if (!unfolded.includes(open) || !unfolded.includes(close)) fail(`${where}: ${open} is not closed`);
  }
  for (const need of ["UID:", "DTSTAMP:", "DTSTART:", "SUMMARY:", "LOCATION:"]) {
    if (!unfolded.includes(need)) fail(`${where}: no ${need}`);
  }
  // a floating or zoned time with no VTIMEZONE is the classic way to land an event an hour out
  if (/DTSTART(;|:)/.test(unfolded) && !/DTSTART:\d{8}T\d{6}Z/.test(unfolded)) {
    fail(`${where}: DTSTART is not a plain UTC stamp, so it would need a VTIMEZONE`);
  }
  if (unfolded.includes("TZID") && !unfolded.includes("BEGIN:VTIMEZONE")) {
    fail(`${where}: uses TZID without a VTIMEZONE`);
  }
}

/* ── 4 · the settings that decide whether any of this reaches the family ────── */

if (!RSVP_PHONE) {
  warn("config: RSVP_PHONE is empty — RSVP opens WhatsApp's contact picker instead of the family");
} else if (!/^[1-9][0-9]{7,14}$/.test(RSVP_PHONE)) {
  fail(`config: RSVP_PHONE "${RSVP_PHONE}" is not a country code plus number, digits only`);
}

if (!RSVP_ENDPOINT) {
  warn("config: RSVP_ENDPOINT is empty — replies queue on each guest's phone; only WhatsApp carries them");
} else if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(RSVP_ENDPOINT)) {
  fail(`config: RSVP_ENDPOINT should be a Google Apps Script /exec URL, got "${RSVP_ENDPOINT}"`);
}

if (!/^https:\/\/.+\/$/.test(SITE)) fail(`config: SITE should be an https URL ending in a slash, got "${SITE}"`);

/* ── 5 · the two generated things that are committed ────────────────────────── */

if (!existsSync(resolve(root, "src/fonts.css"))) {
  fail("fonts: src/fonts.css is missing — run npm run fonts");
} else {
  // the subsetter reads the Sindhi out of the source, so a face that is declared but absent means
  // someone edited fonts.css by hand
  const css = readFileSync(resolve(root, "src/fonts.css"), "utf8");
  for (const m of css.matchAll(/url\(\.\/assets\/fonts\/([^)]+)\)/g)) {
    if (!existsSync(resolve(root, "src/assets/fonts", m[1]))) fail(`fonts: fonts.css points at ${m[1]}, which is not there`);
  }
}

/* ── done ───────────────────────────────────────────────────────────────────── */

for (const w of warns) console.log(`  ⚠  ${w}`);
for (const f of fails) console.error(`  ✗  ${f}`);
if (fails.length) {
  console.error(`\n${fails.length} problem${fails.length === 1 ? "" : "s"}.`);
  process.exit(1);
}
console.log(`  ✓  ${Object.keys(T.en).length} strings in both languages, .ics valid in both, config readable` +
  (warns.length ? `  (${warns.length} warning${warns.length === 1 ? "" : "s"})` : ""));
