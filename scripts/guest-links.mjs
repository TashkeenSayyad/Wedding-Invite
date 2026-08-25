// Turns a list of guest names into personalised invitation links, and draws the gold QR code
// for the printed cards.
//
//   npm run links                      # reads guests.txt
//   npm run links -- --list family.txt
//   npm run links -- "Ahmed Memon" "Fatima"
//   npm run links -- --qr-each         # also a QR per guest, for place cards
//
// Writes everything to out/ (which is not committed): guest-links.csv, guest-links.txt with the
// WhatsApp message ready to paste, and qr-invitation.svg / .png.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "out");

const SITE = "https://tashkeensayyad.github.io/Wedding-Invite/";
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

const named = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--list");
const listFile = value("--list") || "guests.txt";

let names = named;
if (!names.length) {
  const path = resolve(root, listFile);
  if (!existsSync(path)) {
    console.error(`No names given and ${listFile} does not exist.\n` +
      `Either pass names — npm run links -- "Ahmed Memon" "Fatima" — or put one name per line in ${listFile}.`);
    process.exit(1);
  }
  names = readFileSync(path, "utf8").split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}
if (!names.length) { console.error(`${listFile} has no names in it.`); process.exit(1); }

mkdirSync(out, { recursive: true });

// `?to=` is read straight into the greeting, and App.jsx caps it at 40 characters
const linkFor = (name) => SITE + "?to=" + encodeURIComponent(name.slice(0, 40));
const csvCell = (v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
const message = (name, url) =>
  `Assalamu alaikum ${name}! You are warmly invited to the Rukhsati & Walima of Tashkeen & Anusha, ` +
  `Sunday 27 December 2026 at Nerunkot Hall, Qasimabad, Hyderabad. ` +
  `Your invitation is here: ${url}`;

const rows = names.map((name) => ({ name, url: linkFor(name) }));

writeFileSync(resolve(out, "guest-links.csv"),
  "name,link,whatsapp message\n" +
  rows.map((r) => [r.name, r.url, message(r.name, r.url)].map(csvCell).join(",")).join("\n") + "\n");

writeFileSync(resolve(out, "guest-links.txt"),
  rows.map((r) => `${r.name}\n${r.url}\n\n${message(r.name, r.url)}\n${"─".repeat(72)}`).join("\n") + "\n");

const qrOpts = { errorCorrectionLevel: "M", margin: 2, color: { dark: WINE, light: GOLD } };
await QRCode.toFile(resolve(out, "qr-invitation.png"), SITE, { ...qrOpts, type: "png", width: 1200 });
writeFileSync(resolve(out, "qr-invitation.svg"), await QRCode.toString(SITE, { ...qrOpts, type: "svg" }));

if (flag("--qr-each")) {
  mkdirSync(resolve(out, "qr"), { recursive: true });
  for (const r of rows) {
    const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
    await QRCode.toFile(resolve(out, "qr", `${slug}.png`), r.url, { ...qrOpts, type: "png", width: 900 });
  }
}

console.log(`${rows.length} guest${rows.length === 1 ? "" : "s"} → out/guest-links.csv, out/guest-links.txt`);
console.log(`gold QR of ${SITE} → out/qr-invitation.svg, out/qr-invitation.png`);
if (flag("--qr-each")) console.log(`per-guest QR codes → out/qr/`);
console.log(`\nfirst link: ${rows[0].url}`);
