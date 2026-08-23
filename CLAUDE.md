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
- **Schedule:** 7:00 PM guests arrive · 8:00 PM bride & groom · 9:00 PM dinner · 10:30 PM Rukhsati · 12:00 AM evening concludes
- Parking is directly at Nerunkot Hall
- The nikkah has **already happened** — do not add nikkah details
- There is **no mehndi event** on this invitation — it was deliberately removed

## Hard rules

1. **No negative phrasing anywhere.** The user asked for this explicitly and it was a full rewrite pass.
   "Venue closes" → "The evening concludes". "Kindly avoid" → "Reserved with love".
   The timing notice must stay **firm but warm** — it currently says "Kindly be seated by 7:00 PM…
   the evening will move forward on schedule." Keep that balance; don't soften it into vagueness
   and don't make it sound like a warning.
2. **Everything must translate.** Every user-visible string lives in `src/i18n.js` with both
   `en` and `sd` keys. If you add UI text, add both. Sindhi elements need `className="sd-t"`
   for the Nastaliq font and line-height.
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
- 7 sections: `s1` card · `s2` verse · `s3` countdown+scratch heart · `s4` menu · `s5` schedule ·
  `s6` dress code · `s7` closing.

**Known CSS trap:** a class named `.tl` will collide with `.corner.tl` and break corner
positioning. This bug already happened once (a timeline used `.tl`; renamed to `.sched`).

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
  one filled call to action per section (`.btn.solid` — RSVP, share).
- `--gold-fill` is applied via one grouped `background-clip:text` rule near the top of
  `styles.css`; add new display type to that selector list rather than repeating the gradient.
- A gold seam (`.sec::after`) separates sections; `.gilt` is the offset gold rule around the card.
- The revealed scratch heart keeps a gilt outline (`.heartring-base`); only the progress ring fades.

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

The scratch heart specifically: it must survive re-renders. The countdown ticks every second and
once silently repainted the canvas, wiping the user's scratch. `ScratchHeart`'s effect must not
depend on anything that changes per-tick (`onDone` is held in a ref for this reason).

More scratch-heart invariants (added in the scratch-card-improvements pass):
- **`s3` must not show the date before scratching.** The big "27 December 2026" heading used to
  sit right above the heart and spoiled the reveal; it now lives *inside* `.cd-wrap` (with the
  venue line) and only appears after `onDone`. Don't re-add a visible date above the heart.
- Scratch progress is measured against a baseline count of the foil's own opaque pixels taken
  right after painting (`foilTotal`), so the ring starts at zero. The old whole-canvas ratio made
  the ring start half-full because everything outside the heart is already transparent.
  `REVEAL_AT` (0.65) is therefore a fraction of the *foil*, not the canvas.
- Strokes are drawn as round-capped lines between pointer positions (not discrete circles), so a
  fast swipe doesn't leave a dotted trail; `setPointerCapture` keeps the stroke alive when the
  finger drifts off the canvas, and `pointercancel` is treated like pointer-up.

## Still open — ask the user, don't invent

1. **`RSVP_PHONE` in `src/App.jsx` is empty.** Needs the family WhatsApp number, digits only
   (e.g. `"923001234567"`). Until then RSVP opens WhatsApp's contact picker.
2. **Couple photograph** — `s3` has a placeholder frame ("Photograph to follow").
3. **Menu is invented.** Chicken corn soup starter, Sindhi Biryani / Mutton Pulao / Vegetable
   Handi mains — all placeholders awaiting the real menu.
4. **Native Sindhi proofread** — outstanding, especially the timing notice.
5. **"The verse that was recited at our nikkah"** on `s2` — the user has not confirmed this is
   factually true. Verify before it goes out.

## Nice-to-haves discussed but not built

- QR code of the live URL, styled in gold, for the printed cards
- "Light a diya for us" tap interaction on the closing page
- Background music toggle (off by default)

## Deployment

`npm run build` outputs to `docs/`. GitHub Pages: Settings → Pages → deploy from branch
`main`, folder `/docs`. Guest links take `?to=Name` and render "Dear Name," on the envelope.
