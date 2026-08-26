# CLAUDE.md — project memory

Read this first. It carries the full context of how this project was built and what's still open.

## What this is

A bilingual (English / سنڌي) animated wedding invitation website for **Tashkeen & Anusha**.
React 18 + Vite, no router, no backend. Fully static, built into `docs/` for GitHub Pages.

## The event — verified facts, do not change without asking

- **Event name:** "Rukhsati & Walima" (in that order — this was changed late, don't revert)
- **Groom:** Tashkeen Syed, son of Jallal Hyder & Rubina
- **Bride:** Anusha Nizamani, daughter of Barkat Ali & Mumtaz
- The surnames belong to one person each — Syed is Tashkeen's, Nizamani is Anusha's. They are
  never set as a pair ("Syed and Nizamani" under both names was wrong and was corrected).
- **The card artwork carries first names only.** Setting the names on it as TASHKEEN SYED and
  ANUSHA NIZAMANI was built and rejected — the artwork was put back. The surnames live on the
  link-preview card (`og-card.jpg`), one under each name, and nowhere else. If they are ever
  wanted on the artwork after all, the working script is in git at 5e2a7cd, along with the
  measurements it took.
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
   npm run check
   ```

   That one-liner has been replaced by `npm run check`, which runs before every build and also
   catches a key that is empty in one language and still asserting itself in the other. A string
   that is genuinely one-sided has to be listed in `ONE_SIDED` in `scripts/check.mjs` with a
   reason — `closeSd` is the only one, because in Sindhi the farewell heading already *is* that
   phrase.

   A line that mixes a Latin guest name into Sindhi needs an RTL base direction or the
   honorific renders before the name instead of after it — see `.greet.sd-t,.sig.sd-t` in
   `styles.css`. Pure-Arabic runs do not need it.
3. **Sindhi register:** warm and polite, using the **-جو** imperative form (اچجو، رکجو، ڇهجو)
   rather than bare commands. The user rejected an earlier stiff, literal translation.
   **The Sindhi has NOT been checked by a native speaker.** Flag this if asked.
4. **Card artwork is edited with PIL, never regenerated.** `public/assets/card-print.png` is the
   master; it was hand-typeset with PIL (erased Canva's baked text, re-set with Italianno +
   Cormorant SC). Do not regenerate it with AI and do not edit the Canva file — that design is
   out of date. A line of type on it is changed by lifting it off the wine and re-setting it in
   place — the ground under the text is a smooth vertical gradient, so a column redrawn from the
   clean rows just outside the erase is invisible. **`src/assets/card-web.webp` is not a resize
   of the master** — it is a separate, flatter rendering with a brighter wine and a paler cream,
   so any edit has to be made to both cuts on their own terms, each measured against its own
   ground. 5e2a7cd is a worked example of all of this.

## Layout / design system

- Palette: madder crimson `--wine1..4`, antique gold `--gold*`, chalk. Set in `src/styles.css`.
- Ornament (`orn-corner/band/star.webp`) was **cut from the card artwork itself** with alpha,
  so it matches exactly. Corners sit flush at section edges and bloom in on scroll.
- The ajrak background is a custom SVG *kakar jaal* — eight-petal rosettes on a lattice.
  An earlier generic star-grid version was rejected as inauthentic.
- 6 sections: `s1` card · `s2` countdown+scratch heart · `s3` verse · `s4` schedule ·
  `s5` dress code · `s6` closing. (There used to be a `s4` menu section between the countdown
  and schedule — it was removed along with the share button; RSVP moved into `s4` schedule's
  `.acts` row as the solid CTA, and `s4` switched from `deep` to `wine` tone to keep the
  wine/deep alternation from running three `deep` sections in a row.)
  The scratch heart used to sit *after* the verse and was moved in front of it — the ids are
  positional, so they moved with the content rather than the numbering going out of order.
  Both sections are `deep`, so the tone rhythm is untouched; the four corner ornaments stayed
  with the verse, which is the framed section, not with the countdown.)

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

**Gotcha: `npm run fonts` reads the Sindhi strings straight out of `src/i18n.js`, `src/config.js`
and the components. Add or change any Sindhi text and you must re-run it, or the new characters
are not in the subset and render in a fallback face.** It needs `python3` with `fonttools` and
`brotli`; a plain `npm run build` does not. `src/config.js` is in that list because `RSVP_BY`
carries a Sindhi date the moment the family sets one.

One place is deliberately outside the subset: `scripts/guest-links.mjs` holds a Sindhi WhatsApp
invitation, but it is a Node script whose output is pasted into WhatsApp and never rendered by
the page, so it needs no glyphs of ours.

The language pill spells its font stack out — `'Cormorant Garamond','Noto Naskh Arabic',serif` —
rather than using `var(--fs)`. That variable ends in a generic `serif`, which would have won the
Arabic of "سنڌي" before our own Naskh face was ever offered it.

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

- `npm run og` → `public/assets/og-card.jpg` (1200×630, ~94 KB) and the three PWA icons.
  `og:image` used to point at the 2.1 MB portrait `card-print.png`, which WhatsApp will not
  render — and WhatsApp is how this invitation actually travels. Needs pillow + fonttools.
  **The preview card carries the venue and a hint, not the date** — see *Nothing previews the date*.
- `npm run links` → personalised `?to=` links as CSV and as paste-ready WhatsApp messages, plus
  the gold QR for the printed cards, into `out/` (not committed). Reads `guests.txt`, or names
  as arguments, or `--list <file>`; `--qr-each` adds a QR per guest. The QR is deliberately
  **wine modules on a pale gold ground**, not gold on wine — inverted polarity is not something
  every phone camera will read.

## Nothing previews the date

The date is what the scratch heart reveals, so nothing a guest meets *before* opening the
invitation may state it. `DateMask` covers the line printed on the artwork (see the scratch-heart
invariants under *Testing convention*); this is the rest of that rule, and the outside half of it
was open for a while — WhatsApp was printing "Sunday, 27 December 2026" both in the preview card
and in the line of text under it, so the heart revealed something every guest already knew.

Where the date must **not** appear:

- `public/assets/og-card.jpg`. The venue now takes the place under the rule where
  "SUNDAY · 27 DECEMBER 2026" was set, and `maskHint` follows it as a quiet `--gold-l` kicker.
  **Do not put `.datemask`'s gold band on this card.** It was tried and it is far too loud here:
  the band exists to cover ink already printed on the artwork, and there is nothing to cover on a
  card we draw ourselves — the date is simply not set. The one rule under the names is all the
  ornament this half wants; hairlines around the hint as well only crowded it.
- `og:description`, `og:image:alt` and `<meta name="description">` in `index.html`, and
  `description` in `public/manifest.webmanifest`.
- The paste-ready WhatsApp message in `scripts/guest-links.mjs` (both languages) and its twin
  `INVITE_TEXT` in `scripts/rsvp-sheet.gs`. That message sits directly above the preview in the
  thread, so fixing the preview and leaving the message fixes nothing. **Keep the two in step** —
  the Sheet's copy is only a default and the family can rewrite it in `Guest list!J3`.

Where it deliberately still does: the `<noscript>` invitation and the error boundary in
`main.jsx` (a guest whose script never runs cannot scratch anything, and a fallback that withholds
the date is worse than a plain one); the Event JSON-LD's `startDate`, which is search-only — an
Event without one is not an Event, and no link preview reads JSON-LD, so delete the whole block if
the date should be nowhere at all; the Summary header in the family's own Sheet; and the printed
card, which is paper.

The venue stays everywhere. Only the date is the surprise.

**Caches:** WhatsApp holds a scraped preview per URL for days, so `og:image` ends `?v=2` — bump it
whenever the card is redrawn. Each personalised `?to=` link is its own URL and is scraped fresh;
it is the bare site URL, in threads where it has already been shared, that can keep showing the
old card for a while.

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

The sheet also asks for a note and, optionally, a number to reach them on. The note is asked of
the guests who *cannot* come as well — a regret often carries the kindest thing anyone writes all
week. Both are appended to the WhatsApp message after the four labels, never among them.

A guest who has replied from this phone before is shown their own answer instead of an empty
form. Changing it reuses the id their phone generated the first time, which the Apps Script
matches on and overwrites — so remembering a cousin an hour later corrects one row rather than
adding a second. `lastRsvp()` in `src/rsvp-store.js` is what remembers.

### Where a reply goes

Two places, on purpose. `RSVP_ENDPOINT` in **`src/config.js`** (not App.jsx any more — see
*Configuration* below) is a Google Apps Script web app that appends a row to the family's Sheet;
`scripts/rsvp-sheet.gs` is the script and carries its own setup instructions. WhatsApp still
opens as well, because it lands on a phone immediately and it is what works when the Sheet cannot
be reached.

`scripts/rsvp-sheet.gs` is more than an endpoint now. `setup()`, run once from the Apps Script
editor, builds and formats three sheets: **RSVPs** (one row per reply), **Summary** (live counts
and the notes guests left) and **Guest list** — where the family types names into column A and
the personalised link, a ready-to-send WhatsApp message and that guest's reply fill themselves
in. An **RSVPs** menu in the Sheet turns on an email per reply or an evening digest. Nothing is
emailed unless someone asks for it.

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

**The sheet used to have nowhere to scroll**, so one longer string could push the send button off
a 360px phone. It scrolls inside itself now (`.rsvp-in`, capped at 92svh) and the send button
lives in a sticky `.rsvp-foot` that holds its place while the fields scroll under it — measured
across 360×640 up to 430×932, in both languages, with the button on screen everywhere. Two
things to know if you touch it: the footer's `padding-top` is load-bearing (without it
`.rsvp-acts`' top margin collapses through the footer and takes the fade with it), and 360px in
Sindhi is still the tightest case worth re-checking.

## Configuration

Everything the family might change lives in **`src/config.js`**: `RSVP_PHONE`, `RSVP_ENDPOINT`,
`SITE`, an optional `RSVP_BY` deadline, the venue, the maps URL and the three instants the
countdown and the calendar are built from. `.env` values (`VITE_RSVP_PHONE`, `VITE_RSVP_ENDPOINT`,
`VITE_SITE`) win over the file, so the family can rebuild without editing source.

Nothing else should hard-code the date, the venue or the URL. `scripts/guest-links.mjs` and
`src/ics.js` both import from here, which is why the .ics and the Google Calendar link cannot
drift apart.

`RSVP_BY` ships empty in both languages and renders nothing until both are set — a deadline is
the family's fact to state, not one to invent.

## npm run check

`scripts/check.mjs` runs before every build and proves the four things this project has broken
before or would not notice breaking:

- the two languages are the same shape — same keys, same types, arrays the same length, and no
  key emptied in one language while still asserting itself in the other
- every `t.something` a component reaches for exists, and nothing is defined that nothing renders
  (this is what found `photoSoon` and `names`, both long dead)
- the `.ics` is RFC 5545 in **both** languages: CRLF, folded under 75 octets, every BEGIN closed,
  and a plain UTC `DTSTART` so it needs no `VTIMEZONE`
- the config is readable, and it says out loud which of `RSVP_PHONE` / `RSVP_ENDPOINT` are still
  blank

Warnings do not fail the build; a malformed phone number or endpoint does.

`.github/workflows/check.yml` runs it on every push and then fails if `docs/` has fallen behind
`src/`. The site is served from the committed `docs/`, so a source change that was never rebuilt
ships nothing at all while looking perfectly fine. The build is byte-for-byte reproducible, which
is what makes that check trustworthy.

## The countdown has three phases

`useCountdown` returns `phase`, and s2 renders one of three things:

- `before` — the digits, counting down to **7:00 PM on the 27th**, not to midnight. Running to
  the top of the day left the digits at `00:00:00:00` from midnight onwards, on the one day
  every guest opens this.
- `today` — from midnight on the 27th, "Today is the day" and the evening's start time.
- `past` — from 6:00 AM on the 28th, a thank-you. The invitation ages gracefully instead of
  sitting at zero forever.

The ticking interval stops itself once the day arrives.

## Reaching a guest who is not you

Four things exist because the invitation travels further than the people who built it:

- **The calendar is a choice, not a download.** One button used to hand everyone an `.ics`. That
  is right for Apple Calendar and Outlook and close to useless on Android, where the file lands
  in a folder and no calendar app offers to open it — so the guests most likely to be driving up
  from Karachi were the ones who could not add the evening to their phone. `CalPick` in `App.jsx`
  offers Google Calendar alongside the file; both are built from the same two instants in
  `config.js`, so they cannot drift.
- **`?lang=sd`** on a guest link opens the invitation in Sindhi, and beats whatever that phone
  last chose — the family sent that link on purpose. `npm run links` writes it per guest from a
  `Name, sd` line in `guests.txt`.
- **A `<noscript>` invitation** in `index.html`, and an error boundary in `main.jsx` that renders
  the same essentials if the app ever throws. Both are built from literals: a fallback that read
  from `i18n.js` would fail alongside it. An invitation that renders a blank screen is worse than
  a plain one.
- **Event JSON-LD** in the head, so a WhatsApp or search preview states the evening rather than
  guessing at it.

Accessibility, in the same spirit: every section carries a real `<h2>` (visually hidden, using
the same label the dot navigation shows) because the design is built out of ornament and script
faces and offers a screen reader nothing to navigate by. `Sheet.jsx` owns the scroll lock,
Escape and the tab ring for both panels, and hands focus back to whatever opened it. The card on
`s1` is now a real tab stop that opens on Enter or Space, the reader closes on Escape, its close
affordance is a real button rather than a `<span>`, and focus makes the whole round trip — card →
close button → back to the card. The countdown is
`role="timer"` and deliberately **not** a live region — four numbers announced once a second
would make that section unusable. And with `prefers-reduced-motion` the envelope's 3.2-second
opening is cut to 0.26s, because with the animation switched off that wait is just a stall.

## Testing convention

Every change was verified in a real browser before shipping. Please keep this up:

```bash
npm run build && cd docs && python3 -m http.server 8901
```

Then check with Playwright (or manually) at **360, 393, 430 and 820px**, in **both languages**.
The sweep that was run for the configuration/RSVP pass covered all of the below plus the scratch
reveal, the RSVP sheet fitting with its send button on screen, Escape closing both panels and the
reader, offline reload with a `?to=` name intact, and `@media print`. Chromium is at
`/opt/pw-browsers/chromium`; pass it as `executablePath` if the installed Playwright expects a
different build.


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
- **`s2` must not show the date before scratching.** The big "27 December 2026" heading used to
  sit right above the heart and spoiled the reveal; it now lives *inside* `.cd-wrap` (with the
  venue line) and only appears after `onDone`. Don't re-add a visible date above the heart.
- **Nor may the card on `s1`, nor the letter that rises out of the envelope.** The artwork prints
  "SUNDAY · 27 DECEMBER 2026" in full, so the date was given away on the opening screen and the
  scratch revealed nothing. `DateMask` keeps a leaf of gold over that one line — on the `s1` card,
  in the full-screen `#reader`, and on `.letter` in the intro, which scales up 1.85× as it leaves
  the envelope and is perfectly readable while it does — until `scratched` is true, then it fades
  and scales away. (The intro is unmounted long before anyone can scratch, so its mask never
  lifts; that is correct.) Its percentages are of the card itself, so it holds at every width:
  the date line sits at 76.6–77.9% of the height and 26.8–73.1% of the width, identical in
  `card-web.webp` and `card-print.png`, and the band is set wider and taller than that — 15–85%
  across, 74.5% down, 4.9% tall — to carry its writing. That fills the clear ground between the
  divider ornament (ends 73.9%) and the venue line (starts 79.8%) with almost nothing to spare,
  so re-measure all of it if the artwork is ever re-typeset. It is hidden under `@media print` —
  paper should carry the date. The download button on `s4` still hands over the unveiled PNG,
  which is deliberate: it sits after `s2`, and the file is the real invitation.
- **The band says why it is there** (`maskHint`, "Scratch the heart to find out the date"),
  struck into the leaf in wine. Sizing is proportional, not fixed: each host sets `--cw` to the
  width of the card the band is sitting on — `.cardwrap`, `.rd-card` and `.letter` all differ,
  and `.letter` is the smallest — and `.dm-t` is a fraction of that, so the writing holds its
  proportion everywhere and through the letter's scale-up. Both sizes are already at their
  ceiling: English is limited by the band's width (the line fills it at .0265`--cw`) and Sindhi
  by its height, because Nastaliq's ink runs 2.14em tall for this phrase and the band is only
  ~2.5em. Lengthen either string and it will not fit. Nastaliq also hangs most of that ink above
  the baseline, so `.dm-t.sd-t` is nudged up 19% to centre the ink rather than the line box —
  without it the tails of `کرچجو` are clipped by the band's bottom edge.
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

1. **`RSVP_PHONE` and `RSVP_ENDPOINT` are both still empty** — they now live in
   `src/config.js`, or in `.env` as `VITE_RSVP_PHONE` / `VITE_RSVP_ENDPOINT`. `RSVP_PHONE` needs
   the family WhatsApp number, digits only (e.g. `"923001234567"`); until then RSVP opens
   WhatsApp's contact picker. `RSVP_ENDPOINT` needs the deployed Apps Script URL — the script is
   ready and `setup()` builds the whole Sheet, but only the family can create the Sheet and
   deploy it. These two are still the highest-value things left, and `npm run check` says so on
   every build.
2. **Couple photograph** — there is no frame for one any more. The old `.frame` CSS and its
   "Photograph to follow" string were never rendered by any component, so both were removed
   rather than left as dead code. When there is a photograph, build the frame around the real
   image and check `s2` for overflow at 360px — that section already carries the countdown and
   the scratch heart.
3. **Native Sindhi proofread** — outstanding, especially the timing notice. Also unchecked:
   the honorific `جن` used in the greeting (`{name} جن،`), the closing `خاص اوهان لاءِ،`,
   and the three new countdown strings (`today`/`todayNote`/`past`/`pastNote`), and
   `maskHint` on the gold band (`تاريخ ڄاڻڻ لاءِ دل کي کرچجو`).
   Newer and equally unchecked: `langSwitch`, the RSVP additions (`rsvpNote`, `rsvpNotePh`,
   `rsvpContact`, `rsvpAgain`, `rsvpAgainYes`, `rsvpAgainNo`, `rsvpUpdate`, `rsvpKeep`,
   `rsvpQueued`, `rsvpBy`), the calendar chooser (`calPick`, `calGoogle`, `calIcs`), and the
   Sindhi WhatsApp invitation in `scripts/guest-links.mjs`.
4. **"The verse that was recited at our nikkah"** on `s3` — `verseNote` is now empty in *both*
   languages. It had been cleared in English but was still asserting the claim in Sindhi.
   Restore both, or neither.
5. **What the "rasms" at 10:30 PM are** — the schedule just says "Rasms" / "رسمون" for now;
   ask the user if they want the specific rituals named.
6. **Cosmetic:** on `s6` the Nastaliq descenders of `دعائن سان` touch the ascenders of
   "With love and prayers" below it — the two line boxes are exactly adjacent. Pre-existing;
   a small `margin-bottom` on `.sdt` fixes it, but it is the user's typography to change.

## Nice-to-haves discussed but not built

- "Light a diya for us" tap interaction on the closing page
- Background music toggle (off by default)

## Deployment

`npm run build` outputs to `docs/`. GitHub Pages: Settings → Pages → deploy from branch
`main`, folder `/docs`. Guest links take `?to=Name` and render "Dear Name," on the envelope, and
`?lang=sd` opens it in Sindhi.

`docs/` is committed, so the build is part of the change — push a source edit without rebuilding
and the site quietly keeps serving the previous version. `.github/workflows/check.yml` catches
exactly that.
