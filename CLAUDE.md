# CLAUDE.md — project memory

Read this first. It carries the full context of how this project was built and what's still open.

## What this is

A bilingual (English / سنڌي) animated wedding invitation website for **Tashkeen & Anusha**.
React 18 + Vite, no router, no backend. Fully static, built into `docs/` for GitHub Pages.

## The event — verified facts, do not change without asking

- **Event name:** "Rukhsati & Walima" (in that order — this was changed late, don't revert)
- **Groom:** Tashkeen, son of Jallal Hyder & Rubina
- **Bride:** Anusha, daughter of Barkat Ali & Mumtaz
- **Date:** Sunday, 27 December 2026
- **Venue:** Nerunkot Hall, Qasimabad, Hyderabad, Sindh, Pakistan
- **Schedule:** 7:00 PM guests arrive · 8:00 PM entrance of the bride & groom · 9:00 PM dinner ·
  10:30 PM rasms · 12:00 AM Rukhsati (Rukhsati is the final event of the night — the rasms happen
  before it, not after)
- Parking is directly at Nerunkot Hall
- The nikkah has **already happened** — do not add nikkah details
- There is **no mehndi event** on this invitation — it was deliberately removed
- There is **no printed menu** on this invitation — the menu section was removed; do not re-add it
- There is **no share button** on this invitation — it was removed from both the topbar and the
  closing section; RSVP is now the sole call-to-action button

## Hard rules

1. **No negative phrasing anywhere.** The user asked for this explicitly and it was a full rewrite pass.
   "Venue closes" → "The evening concludes". "Kindly avoid" → "Reserved with love".
   The timing notice must stay **firm but warm** — it currently says "Kindly be seated by 7:00 PM…
   the evening will move forward on schedule." Keep that balance; don't soften it into vagueness
   and don't make it sound like a warning.
2. **Everything must translate.** Every user-visible string lives in `src/i18n.js` with both
   `en` and `sd` keys. If you add UI text, add both. Sindhi elements need `className="sd-t"`
   for the Nastaliq font and line-height. The two key sets must stay identical — this has
   already drifted twice (a Plum dress-code chip lived on in Sindhi after being dropped from
   English; the nikkah note was cleared in English but kept shipping in Sindhi). Check with:

   ```bash
   node --input-type=module -e "import('./src/i18n.js').then(m=>console.log(
     JSON.stringify(Object.keys(m.T.en).sort())===JSON.stringify(Object.keys(m.T.sd).sort())))"
   ```

   A line that mixes a Latin guest name into Sindhi needs an RTL base direction or the
   honorific renders before the name instead of after it — see `.greet.sd-t,.sig.sd-t` in
   `styles.css`. Pure-Arabic runs do not need it.
3. **Sindhi register:** warm and polite, using the **-جو** imperative form (اچجو، رکجو، ڇهجو)
   rather than bare commands. The user rejected an earlier stiff, literal translation.
   **The Sindhi has NOT been checked by a native speaker.** Flag this if asked.
4. **Card artwork is fixed.** `public/assets/card-print.png` is the master. It was hand-typeset
   with PIL (erased Canva's baked text, re-set with Italianno + Cormorant SC). Do not regenerate
   it with AI and do not edit the Canva file — that design is out of date.

## Layout / design system

- Palette: madder crimson `--wine1..4`, antique gold `--gold*`, chalk. Set in `src/styles.css`.
- Ornament (`orn-corner/band/star.webp`) was **cut from the card artwork itself** with alpha,
  so it matches exactly. Corners sit flush at section edges and bloom in on scroll.
- The ajrak background is a custom SVG *kakar jaal* — eight-petal rosettes on a lattice.
  An earlier generic star-grid version was rejected as inauthentic.
- 6 sections: `s1` card · `s2` verse · `s3` countdown+scratch heart · `s4` schedule ·
  `s5` dress code · `s6` closing. (There used to be a `s4` menu section between the countdown
  and schedule — it was removed along with the share button; RSVP moved into `s4` schedule's
  `.acts` row as the solid CTA, and `s4` switched from `deep` to `wine` tone to keep the
  wine/deep alternation from running three `deep` sections in a row.)

**Known CSS trap:** a class named `.tl` will collide with `.corner.tl` and break corner
positioning. This bug already happened once (a timeline used `.tl`; renamed to `.sched`).

**Second trap, same shape:** `.cardwrap` is a `transform-style:preserve-3d` context, so z-index
does not decide what is on top there — the tilted `.card3d` reaches further toward the viewer
than any flat sibling, whatever its z-index. A tap target laid over the card as an absolutely
positioned sibling therefore sat *behind* the artwork and "Tap to read" did nothing in Chromium.
The handler now lives on `.cardwrap` itself and clicks bubble up to it. Don't put an overlay
back inside that element expecting z-index to save it.

### Restraint pass (gold-contrast cleanup)

The user asked for stronger gold contrast and for the showy effects to go — they read as
unprofessional. **Do not reintroduce any of these:**

- the gold bloom / burst / flying sparks and the full-screen flash when the envelope opens
- the falling rose-petal shower (on open and on scratch-complete)
- the pulsing "ping" ring on the wax seal, and the seal's spin-in entrance
- the breathing crimson halo on the intro, the floating gold motes, the breathing `.aura`
  behind the card, and the looping `.shine` glare sweep across it
- the perpetual float/bob on the card
- emoji: the ❤ burst on scratch-complete, the ♡ before the scratch hint, the ✦ on the foil
  (the foil hint is now text between two etched hairlines)
- blinking text and gold `box-shadow` glows on the thread, dots, timeline markers and heart ring

The envelope still opens (flap, letter rise, cross-fade), the reveal-on-scroll and the
device-tilt parallax stay — motion should come from real interaction, not decoration.

Gold contrast is a system, not ad-hoc tints:
- `--gold-line` (.62α) for structural hairlines, `--gold-hair` (.26α) for secondary inner rules,
  `--gold-l` for small caps/kickers, `--gold-fill` (the leaf ramp) for display type and the
  one filled call to action per section (`.btn.solid` — RSVP is the only one now).
- `--gold-fill` is applied via one grouped `background-clip:text` rule near the top of
  `styles.css`; add new display type to that selector list rather than repeating the gradient.
- A gold seam (`.sec::after`) separates sections; `.gilt` is the offset gold rule around the card.
- The revealed scratch heart keeps a gilt outline (`.heartring-base`); only the progress ring fades.

## Fonts — self-hosted and split

Nothing is fetched from fonts.googleapis.com any more (two connections before first paint, and
it made offline impossible). `npm run fonts` builds `src/assets/fonts/` and generates
`src/fonts.css`, both committed:

- Latin faces are copied out of `@fontsource`, declared with the real `unicode-range` so
  latin-ext is only fetched when a guest's name actually needs it
- Noto Naskh Arabic is subset to the Qur'anic verse and the bismillah — 51 KB → 13 KB
- Noto Nastaliq Urdu is split in two. **`Nastaliq Core`** is a ~46 KB cut holding only the
  Sindhi flourishes that appear while the site is in English (bismillah, the couple's names,
  the closing line) and is used by `.pre-sd`, `.nm-sd`, `.sdt` via `--fsd-c`. The full Sindhi
  cut is *not* in the CSS at all — `App.jsx` loads it through the FontFace API the moment a
  reader picks سنڌي. That is why the two have different family names: sharing one name would
  render Sindhi body copy half in Nastaliq and half in the fallback while it loaded.

English first paint is ~247 KB of fonts, down from ~393 KB. Sindhi adds ~159 KB on the switch.

**Gotcha: `npm run fonts` reads the Sindhi strings straight out of `src/i18n.js` and the
components. Add or change any Sindhi text and you must re-run it, or the new characters are
not in the subset and render in a fallback face.** It needs `python3` with `fonttools` and
`brotli`; a plain `npm run build` does not.

## Offline and installable

`npm run build` runs `vite build` then `scripts/gen-sw.mjs`, which writes `docs/sw.js` with the
built file list baked in and a cache name hashed from it (so a new build evicts the old cache).
Everything is precached except `card-print.png` (2.1 MB) and `og-card.jpg`, which are cached at
runtime instead. Navigations serve the cached shell first and refresh behind the reader, so a
`?to=` link opens instantly with no signal. `public/manifest.webmanifest` plus the generated
icons make it installable to a home screen.

Registration is guarded by `import.meta.env.PROD` — there is no `sw.js` in dev and a stale cache
there would be a nuisance.

## Generated artwork

- `npm run og` → `public/assets/og-card.jpg` (1200×630, ~90 KB) and the three PWA icons.
  `og:image` used to point at the 2.1 MB portrait `card-print.png`, which WhatsApp will not
  render — and WhatsApp is how this invitation actually travels. Needs pillow + fonttools.
- `npm run links` → personalised `?to=` links as CSV and as paste-ready WhatsApp messages, plus
  the gold QR for the printed cards, into `out/` (not committed). Reads `guests.txt`, or names
  as arguments, or `--list <file>`; `--qr-each` adds a QR per guest. The QR is deliberately
  **wine modules on a pale gold ground**, not gold on wine — inverted polarity is not something
  every phone camera will read.

## The RSVP is composed, not free-text

The RSVP button opens `src/components/Rsvp.jsx` rather than jumping straight to WhatsApp. A
`wa.me` link cannot carry a headcount and free-text replies arrive in twenty different shapes,
so the sheet asks the two questions that matter and hands WhatsApp a message with the same shape
every time:

```
Assalamu alaikum! RSVP for the Rukhsati & Walima of Tashkeen & Anusha, 27 December 2026.
Invitation: Ahmed Memon        ← only when the link carried ?to=
Attending: yes
How many: 3
Names: Ahmed Memon, Fatima, Zoya
```

Declines get the same header and `Attending: no`, with no headcount asked for. **Keep the four
labels stable** — the whole point is that the family can scan a thread and count.

The count and the names are allowed to disagree (four coming, two named, is a real answer about
children) — do not "fix" that by forcing one to match the other.

### Where a reply goes

Two places, on purpose. `RSVP_ENDPOINT` in `src/App.jsx` is a Google Apps Script web app that
appends a row to the family's Sheet — `scripts/rsvp-sheet.gs` is the script and carries its own
setup instructions. WhatsApp still opens as well, because it lands on a phone immediately and it
is what works when the Sheet cannot be reached.

`src/rsvp-store.js` is what makes that safe:

- the reply is written to `localStorage` **before** anything that can fail is attempted
- `flushRsvps` claims the whole queue synchronously before its first `await`, so two flushes
  cannot send the same reply twice
- retries reuse the id the phone generated, and the Apps Script matches on it and overwrites in
  place — a reply that saved but whose response the browser could not read is updated, never
  duplicated
- the queue drains on the next visit and on the `online` event, and gives up after 25 tries

**The POST must stay a CORS "simple" request** — `Content-Type: text/plain;charset=utf-8`, no
custom headers. Apps Script has no `OPTIONS` handler, so anything that provokes a preflight
(`application/json` included) never arrives. `keepalive: true` matters too: WhatsApp opens in the
same click and would otherwise cancel the request.

`window.open` for WhatsApp has to be called straight from the click handler, before any `await`,
or Safari blocks it as an unrequested popup.

The endpoint is public and write-only — it is in the page source, so anyone could post a junk
row. The script caps field lengths and validates the shape; do not put anything sensitive in
that Sheet.

The sheet must never grow taller than the viewport; it has nowhere to scroll. If a string gets
longer, check it again at 360px in Sindhi, which is the tightest case.

## The countdown has three phases

`useCountdown` returns `phase`, and s3 renders one of three things:

- `before` — the digits, counting down to **7:00 PM on the 27th**, not to midnight. Running to
  the top of the day left the digits at `00:00:00:00` from midnight onwards, on the one day
  every guest opens this.
- `today` — from midnight on the 27th, "Today is the day" and the evening's start time.
- `past` — from 6:00 AM on the 28th, a thank-you. The invitation ages gracefully instead of
  sitting at zero forever.

The ticking interval stops itself once the day arrives.

## Testing convention

Every change was verified in a real browser before shipping. Please keep this up:

```bash
npm run build && cd docs && python3 -m http.server 8901
```

Then check with Playwright (or manually) at **360, 393, 430 and 820px**, in **both languages**:
- no section content taller than its section (overflow)
- no horizontal scroll
- corners flush to section edges
- no duplicated visible Sindhi strings
- no console errors
- the language pill is reachable **on the intro**, before the envelope is opened
- in English only `Nastaliq Core` loads; picking سنڌي pulls in `Noto Nastaliq Urdu` 400 and 600

Note that **s4 is legitimately taller than the viewport** at every width — it carries the
schedule, the timing notice, the parking and travel notes and four buttons. `.sec` grows to fit
and `scroll-snap-type` is `proximity`, so nothing is clipped; it is a section you scroll
through. Do not "fix" this by cutting content.

Worth checking too, since none of it is visible on screen: the `.ics` parses (no `TZID` without
a `VTIMEZONE`, lines folded under 75 octets, CRLF endings), the site still opens with the
network off once it has been seen, and `@media print` gives ink on white with the chrome gone.

The scratch heart specifically: it must survive re-renders. The countdown ticks every second and
once silently repainted the canvas, wiping the user's scratch. `ScratchHeart`'s effect must not
depend on anything that changes per-tick (`onDone` is held in a ref for this reason).

More scratch-heart invariants (added in the scratch-card-improvements pass):
- **`s3` must not show the date before scratching.** The big "27 December 2026" heading used to
  sit right above the heart and spoiled the reveal; it now lives *inside* `.cd-wrap` (with the
  venue line) and only appears after `onDone`. Don't re-add a visible date above the heart.
- **Nor may the card on `s1`.** The artwork prints "SUNDAY · 27 DECEMBER 2026" in full, so the
  date was given away on the opening screen and the scratch revealed nothing. `.datemask` keeps
  a leaf of gold over that one line — on the `s1` card and in the full-screen `#reader` — until
  `scratched` is true, then it fades and scales away. Its percentages are of the card itself
  (the line sits at 76.6–77.9% of the height, 26.8–73.1% of the width, identical in
  `card-web.webp` and `card-print.png`), so it holds at every width; re-measure them if the
  artwork is ever re-typeset. It is hidden under `@media print` — paper should carry the date.
  The download button on `s4` still hands over the unveiled PNG, which is deliberate: it sits
  after `s3`, and the file is the real invitation.
- Scratch progress is measured against a baseline count of the foil's own opaque pixels taken
  right after painting (`foilTotal`), so the ring starts at zero. The old whole-canvas ratio made
  the ring start half-full because everything outside the heart is already transparent.
  `REVEAL_AT` (0.95) is therefore a fraction of the *foil*, not the canvas.
- **`foilTotal` must be counted before the heart outline is stroked, and the outline's own
  contribution held as `floor`.** The outline straddles the clip edge, so its outer half can
  never be scratched off — counted as foil it puts a ceiling of ~0.985 on progress, which at
  `REVEAL_AT` 0.95 leaves almost no headroom. With the correction a full scratch reaches a true
  1.0 and the bar fires at 0.95 (measured: 0.952, after ~34 short strokes; it does not fire at
  0.94). Raising `REVEAL_AT` without this correction will make the heart feel broken.
- Strokes are drawn as round-capped lines between pointer positions (not discrete circles), so a
  fast swipe doesn't leave a dotted trail; `setPointerCapture` keeps the stroke alive when the
  finger drifts off the canvas, and `pointercancel` is treated like pointer-up.

## Still open — ask the user, don't invent

1. **`RSVP_PHONE` and `RSVP_ENDPOINT` in `src/App.jsx` are both still empty.** `RSVP_PHONE`
   needs the family WhatsApp number, digits only (e.g. `"923001234567"`); until then RSVP opens
   WhatsApp's contact picker. `RSVP_ENDPOINT` needs the deployed Apps Script URL from
   `scripts/rsvp-sheet.gs`; until then replies queue on each guest's phone and only WhatsApp
   carries them. These two are the highest-value things left.
2. **Couple photograph** — `s3` has a placeholder frame ("Photograph to follow").
3. **Native Sindhi proofread** — outstanding, especially the timing notice. Also unchecked:
   the honorific `جن` used in the greeting (`{name} جن،`), the closing `خاص اوهان لاءِ،`,
   and the three new countdown strings (`today`/`todayNote`/`past`/`pastNote`).
4. **"The verse that was recited at our nikkah"** on `s2` — `verseNote` is now empty in *both*
   languages. It had been cleared in English but was still asserting the claim in Sindhi.
   Restore both, or neither.
5. **What the "rasms" at 10:30 PM are** — the schedule just says "Rasms" / "رسمون" for now;
   ask the user if they want the specific rituals named.
6. **Cosmetic:** on `s6` the Nastaliq descenders of `دعائن سان` touch the ascenders of
   "With love and prayers" below it — the two line boxes are exactly adjacent. Pre-existing;
   a small `margin-bottom` on `.sdt` fixes it, but it is the user's typography to change.

## Nice-to-haves discussed but not built

- QR code of the live URL, styled in gold, for the printed cards
- "Light a diya for us" tap interaction on the closing page
- Background music toggle (off by default)

## Deployment

`npm run build` outputs to `docs/`. GitHub Pages: Settings → Pages → deploy from branch
`main`, folder `/docs`. Guest links take `?to=Name` and render "Dear Name," on the envelope.
