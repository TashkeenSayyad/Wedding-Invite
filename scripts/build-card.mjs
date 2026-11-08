#!/usr/bin/env node
// Renders the invitation card from scripts/card/card.html and writes both cuts:
//
//   public/assets/card-print.png   1191 × 1680, the print master (and the download on s4)
//   src/assets/card-web.webp        900 × 1270, the card on s1, the reader and the envelope letter
//
// The page is drawn at twice the size and scaled down, which gives the hairlines and the foil
// cleaner edges than rendering at 1×. Both cuts come from the same drawing, so — unlike the old
// artwork — they are no longer two renderings to keep in step.
//
// Needs Playwright with Chromium (preinstalled in the cloud container) and python3 with pillow.
//   npm run card
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const W = 1191, H = 1680, SCALE = 2;

const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(pathToFileURL(path.join(ROOT, "scripts/card/card.html")).href);
await page.waitForFunction(() => window.__ready === true);
if (errors.length) throw new Error(errors.join("\n"));

// Nothing may fall inside DateMask's band but the date itself, and the date must fit inside it.
const { report, mask } = await page.evaluate(() => window.__layout);
const d = report.date;
if (d.x0 < mask.x0 + 20 || d.x1 > mask.x1 - 20 || d.y0 < mask.y0 || d.y1 > mask.y1)
  throw new Error(`the date line ${JSON.stringify(d)} is not inside the mask ${JSON.stringify(mask)}`);
for (const [id, b] of Object.entries(report)) {
  if (id === "date") continue;
  if (b.y1 > mask.y0 && b.y0 < mask.y1) throw new Error(`"${id}" runs into the date band: ${JSON.stringify(b)}`);
}
console.log(`date line: ${(d.x0 / W * 100).toFixed(1)}–${(d.x1 / W * 100).toFixed(1)}% across, ` +
  `${(d.y0 / H * 100).toFixed(1)}–${(d.y1 / H * 100).toFixed(1)}% down`);

const tmp = mkdtempSync(path.join(tmpdir(), "card-"));
const big = path.join(tmp, "card@2x.png");
await page.screenshot({ path: big, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();

execFileSync("python3", ["-c", `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB")
im.resize((${W}, ${H}), Image.LANCZOS).save(sys.argv[2], optimize=True)
im.resize((900, 1270), Image.LANCZOS).save(sys.argv[3], quality=86, method=6)
`, big, path.join(ROOT, "public/assets/card-print.png"), path.join(ROOT, "src/assets/card-web.webp")],
{ stdio: "inherit" });
rmSync(tmp, { recursive: true, force: true });
console.log("wrote public/assets/card-print.png and src/assets/card-web.webp");
