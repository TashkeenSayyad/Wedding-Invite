// Renders the Baarat & Rukhsati video invitation: out/baarat-rukhsati-invite.mp4, 1080×1920, 30fps,
// set to the same Alfaaz instrumental the site plays.
//
//   node scripts/make-video.mjs            # the whole video
//   node scripts/make-video.mjs --still 12  # one frame, out/video-frame.png, for checking a moment
//
// The scene is scripts/video/scene.html. It has no animation of its own: render(t) sets the frame
// for time t, so this steps t, screenshots, and hands the frames to ffmpeg. The output is the same
// on every run. Needs ffmpeg and Playwright's Chromium (both preinstalled in the cloud sessions).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";

// Playwright is not a dependency of the site; the cloud sessions have it installed globally.
const { chromium } = createRequire(import.meta.url)("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scene = pathToFileURL(path.join(root, "scripts/video/scene.html")).href;
const out = path.join(root, "out");
const frames = path.join(out, "video-frames");
const FPS = 30;
// The track is quiet for its first half minute and opens out at ~0:35, so the video starts it
// at 0:30: the envelope opens on the soft part and the lanterns light as the music fills in.
const MUSIC = path.join(root, "public/assets/music.mp3");
const MUSIC_FROM = 30;

const launch = () => chromium.launch();
async function page(browser) {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto(scene);
  await p.evaluate(() => window.ready);
  return p;
}

mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);

if (args[0] === "--still") {
  const browser = await launch();
  const p = await page(browser);
  await p.evaluate((t) => window.render(t), +args[1] || 0);
  const file = path.join(out, "video-frame.png");
  await p.screenshot({ path: file });
  await browser.close();
  console.log(file);
  process.exit(0);
}

rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const probe = await launch();
const DURATION = await (await page(probe)).evaluate(() => window.DURATION);
await probe.close();
const total = Math.round(DURATION * FPS);
const workers = Math.max(1, Math.min(4, os.cpus().length - 1));
let done = 0;

await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const browser = await launch();
  const p = await page(browser);
  for (let i = w; i < total; i += workers) {
    await p.evaluate((t) => window.render(t), i / FPS);
    await p.screenshot({ path: path.join(frames, `f${String(i).padStart(5, "0")}.png`) });
    if (++done % 60 === 0) process.stdout.write(`${done}/${total} frames\n`);
  }
  await browser.close();
}));

const file = path.join(out, "baarat-rukhsati-invite.mp4");
const audio = existsSync(MUSIC)
  ? ["-ss", String(MUSIC_FROM), "-t", String(DURATION), "-i", MUSIC]
  : [];
execFileSync("ffmpeg", [
  "-y", "-v", "error",
  "-framerate", String(FPS), "-i", path.join(frames, "f%05d.png"),
  ...audio,
  ...(audio.length ? [
    // a social video is played at the phone's own volume, so it is levelled to a normal loudness
    // here, not the quieter level the site's autoplaying copy is kept at
    "-af", `loudnorm=I=-18:TP=-1.5:LRA=11,afade=t=in:d=1.2,afade=t=out:st=${DURATION - 2.6}:d=2.6`,
    "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-shortest",
  ] : []),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
  "-profile:v", "high", "-level", "4.1", "-movflags", "+faststart",
  file,
], { stdio: "inherit" });
rmSync(frames, { recursive: true, force: true });
console.log(file);
