// Turns a list of guest names into personalised invitation links, and draws the gold QR code
// for the printed cards.
//
//   npm run links                      # reads guests.txt
//   npm run links -- --list family.txt
//   npm run links -- "Ahmed Memon" "Fatima"
//   npm run links -- --lang sd         # every link opens in Sindhi
//   npm run links -- --qr-each         # also a QR per guest, for place cards
//
// guests.txt is one name per line. A line can also name that guest's language, which is how a
// bilingual family sends one list and each guest opens the invitation in their own:
//
//   Ahmed Memon
//   ڪنول, sd
//   Fatima, en
//
// Writes everything to out/ (which is not committed): guest-links.csv, guest-links.txt with the
// WhatsApp message ready to paste, and qr-invitation.svg / .png.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { SITE } from "../src/config.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "out");

// Wine modules on a pale gold ground. Gold-on-wine looks better but inverts the polarity every
// QR scanner expects, and a printed card gets read by whatever camera app a guest happens to have.
const WINE = "#4d0e1c";
const GOLD = "#f4e6c8";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};

const TAKES_VALUE = new Set(["--list", "--lang"]);
const named = argv.filter((a, i) => !a.startsWith("--") && !TAKES_VALUE.has(argv[i - 1]));
const listFile = value("--list") || "guests.txt";
const allLang = value("--lang") || "";
if (allLang && allLang !== "en" && allLang !== "sd") {
  console.error(`--lang takes "en" or "sd", not "${allLang}".`);
  process.exit(1);
}

// "Name" or "Name, sd" — the language is optional and only ever the last comma-separated field
const parse = (line) => {
  const m = line.match(/^(.*?)\s*,\s*(en|sd)$/);
  return m ? { name: m[1].trim(), lang: m[2] } : { name: line, lang: "" };
};

let rows = named.map((n) => ({ name: n, lang: "" }));
if (!rows.length) {
  const path = resolve(root, listFile);
  if (!existsSync(path)) {
    console.error(`No names given and ${listFile} does not exist.\n` +
      `Either pass names — npm run links -- "Ahmed Memon" "Fatima" — or put one name per line in ${listFile}.\n` +
      `There is a sample to copy in guests.example.txt.`);
    process.exit(1);
  }
  rows = readFileSync(path, "utf8").split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map(parse);
}
if (!rows.length) { console.error(`${listFile} has no names in it.`); process.exit(1); }

// A guest invited twice gets two links and, sooner or later, two RSVP rows to reconcile.
const seen = new Map();
const dupes = [];
rows = rows.filter((r) => {
  const key = r.name.toLowerCase();
  if (seen.has(key)) { dupes.push(r.name); return false; }
  seen.set(key, true);
  return true;
});

mkdirSync(out, { recursive: true });

// `?to=` is read straight into the greeting, and App.jsx caps it at 40 characters
const linkFor = ({ name, lang }) => {
  const l = lang || allLang;
  return SITE + "?to=" + encodeURIComponent(name.slice(0, 40)) + (l ? "&lang=" + l : "");
};
const csvCell = (v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
// The date is left out on purpose: this message sits directly above the link preview in the
// thread, and the preview no longer carries it either — the scratch heart is what tells a guest
// the date. The venue stays; only the date is the surprise.
const message = (name, url) =>
  `Assalamu alaikum ${name}! You are warmly invited to the Rukhsati & Walima of Tashkeen & Anusha ` +
  `at Nerunkot Hall, Qasimabad, Hyderabad. ` +
  `Your invitation is here — scratch the heart to find out the date: ${url}`;
// Kept in the same shape as the English so the family can scan either list the same way.
const messageSd = (name, url) =>
  `السلام عليڪم ${name}! تاشقين ۽ انوشا جي رخصتيءَ ۽ وليمي ۾ اوهان کي محبت سان دعوت آهي — ` +
  `نيرون ڪوٽ هال، قاسم آباد، حيدرآباد. ` +
  `اوهان جي دعوت هتي آهي، تاريخ ڄاڻڻ لاءِ دل کي کرچجو: ${url}`;

const list = rows.map((r) => {
  const url = linkFor(r);
  const lang = r.lang || allLang || "en";
  return { name: r.name, lang, url, text: lang === "sd" ? messageSd(r.name, url) : message(r.name, url) };
});

writeFileSync(resolve(out, "guest-links.csv"),
  "name,language,link,whatsapp message\n" +
  list.map((r) => [r.name, r.lang, r.url, r.text].map(csvCell).join(",")).join("\n") + "\n");

writeFileSync(resolve(out, "guest-links.txt"),
  list.map((r) => `${r.name}\n${r.url}\n\n${r.text}\n${"─".repeat(72)}`).join("\n") + "\n");

const qrOpts = { errorCorrectionLevel: "M", margin: 2, color: { dark: WINE, light: GOLD } };
await QRCode.toFile(resolve(out, "qr-invitation.png"), SITE, { ...qrOpts, type: "png", width: 1200 });
writeFileSync(resolve(out, "qr-invitation.svg"), await QRCode.toString(SITE, { ...qrOpts, type: "svg" }));

if (flag("--qr-each")) {
  mkdirSync(resolve(out, "qr"), { recursive: true });
  // Two guests can slug to the same filename — "Ahmed Memon" and "Ahmed-Memon" both become
  // ahmed-memon — and the second would silently overwrite the first's place card.
  const taken = new Map();
  for (const r of list) {
    let slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
    const n = (taken.get(slug) || 0) + 1;
    taken.set(slug, n);
    if (n > 1) slug += "-" + n;
    await QRCode.toFile(resolve(out, "qr", `${slug}.png`), r.url, { ...qrOpts, type: "png", width: 900 });
  }
}

const sindhi = list.filter((r) => r.lang === "sd").length;
console.log(`${list.length} guest${list.length === 1 ? "" : "s"}` +
  (sindhi ? ` (${sindhi} in Sindhi)` : "") + ` → out/guest-links.csv, out/guest-links.txt`);
if (dupes.length) console.log(`skipped ${dupes.length} repeated name${dupes.length === 1 ? "" : "s"}: ${dupes.join(", ")}`);
console.log(`gold QR of ${SITE} → out/qr-invitation.svg, out/qr-invitation.png`);
if (flag("--qr-each")) console.log(`per-guest QR codes → out/qr/`);
console.log(`\nfirst link: ${list[0].url}`);
