// Writes bridal/index.html — the bride's family's invitation — from index.html.
//
// The two pages run the same app; the only differences are who invites and whose name comes
// first, and the app reads that from data-side="bridal" on <html> (see SIDE in src/config.js).
// So this page is not maintained by hand: it is index.html with the couple named Anusha first,
// its own URL, its own link-preview card, and paths one folder up. Runs before every build, and
// the result is committed so `npm run dev` serves /bridal/ too. Every substitution must land, or
// it stops — a changed index.html should fail loudly here rather than ship a half-swapped page.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://tashkeensayyad.github.io/Wedding-Invite/";
let html = readFileSync(resolve(root, "index.html"), "utf8");

const swaps = [
  ['<html lang="en">', '<html lang="en" data-side="bridal">'],
  ["Tashkeen &amp; Anusha", "Anusha &amp; Tashkeen"],
  ["Tashkeen & Anusha", "Anusha & Tashkeen"],
  [`${SITE}assets/og-card.jpg?v=4`, `${SITE}assets/og-card-bridal.jpg?v=1`],
  [`"${SITE}"`, `"${SITE}bridal/"`],
  ['href="./manifest.webmanifest"', 'href="../manifest-bridal.webmanifest"'],
  ['href="./assets/icon-192.png"', 'href="../assets/icon-192.png"'],
];
for (const [from, to] of swaps) {
  if (!html.includes(from)) throw new Error(`bridal-html: "${from}" is no longer in index.html`);
  html = html.split(from).join(to);
}
html = html.replace("<!doctype html>",
  "<!doctype html>\n<!-- Generated from index.html by scripts/bridal-html.mjs — edit that, not this. -->");

mkdirSync(resolve(root, "bridal"), { recursive: true });
writeFileSync(resolve(root, "bridal/index.html"), html);
console.log("bridal/index.html written");
