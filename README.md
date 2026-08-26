# Rukhsati & Walima — Tashkeen & Anusha

A bilingual (English / سنڌي) animated wedding invitation. React + Vite, fully static — built for GitHub Pages.

## Deploy to GitHub Pages (5 minutes, no build needed)

The site is already built into the **`docs/`** folder.

1. Create a new repository on GitHub (e.g. `shaadi`), public.
2. Upload **everything in this folder** (drag-and-drop works on github.com → "uploading an existing file").
3. In the repo: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/docs** → Save.
4. Wait ~1 minute. Your invitation is live at
   `https://<your-username>.github.io/shaadi/`

## The two settings that make the RSVP work

Both live in **`src/config.js`**, and both start empty:

- **`RSVP_PHONE`** — the family WhatsApp number, country code first, digits only,
  e.g. `"923001234567"`. Until it is set, RSVP opens WhatsApp's contact picker and replies
  arrive addressed to nobody.
- **`RSVP_ENDPOINT`** — the Google Apps Script web app URL ending in `/exec` (see below).
  Until it is set, replies queue on each guest's phone and only WhatsApp carries them.

If you would rather not edit source, copy `.env.example` to `.env` and put them there instead —
those values win. Either way, run `npm run build` afterwards.

`npm run check` tells you which of the two are still missing, and refuses the build outright if
one of them is malformed.

## The Google Sheet

`scripts/rsvp-sheet.gs` is the whole back office in one file — the endpoint the invitation posts
to, the sheets the family reads, and the emails that say a reply came in. Setup is in the comment
at the top of that file; in short:

1. New Google Sheet → **Extensions → Apps Script**, paste the file in, Save.
2. Run the **`setup`** function once. It builds three sheets:
   - **RSVPs** — one row per reply, written by the invitation.
   - **Summary** — live counts: guests attending, still to reply, what people wrote.
   - **Guest list** — type your guest names into column A and every other column fills itself:
     the personalised invitation link, a WhatsApp message ready to send, and that guest's reply
     the moment it arrives.
3. **Deploy → New deployment → Web app**, *Execute as: Me*, *Who has access: **Anyone***.
4. Copy the `/exec` URL into `RSVP_ENDPOINT`, rebuild, push.

Reload the Sheet afterwards and an **RSVPs** menu appears: email me every reply, or a summary
each evening.

The endpoint is public and write-only — it is in the page source, so anyone could post a junk
row. The script caps every field and stops the sheet growing past 5,000 rows. Don't put anything
sensitive in that Sheet.

### How a reply reaches you

Every reply goes two ways, on purpose. The Sheet is what you count from; WhatsApp lands on a
phone immediately and still works when the Sheet cannot be reached. The reply is saved on the
guest's phone *before* either is attempted, so a dropped connection on the road to Hyderabad
loses nothing — it goes out on their next visit or the moment they reconnect.

A guest who replies twice does not make two rows. Their phone keeps the id it generated the
first time, the script matches on it, and the row is corrected in place — so remembering a cousin
an hour later updates the count instead of doubling it.

### Personalised guest links

Append `?to=Name` for each guest:
`https://<you>.github.io/shaadi/?to=Ahmed` → the envelope greets "Dear Ahmed," and the closing
section signs off to them by name. `?lang=sd` opens it in Sindhi.

To do a whole guest list at once, copy `guests.example.txt` to `guests.txt`, put one name per
line, and run:

```bash
npm run links                 # → out/guest-links.csv, out/guest-links.txt, out/qr-invitation.svg
npm run links -- --qr-each    # also one QR code per guest, for place cards
npm run links -- --lang sd    # every link opens in Sindhi
```

A line can name that guest's language — `ڪنول, sd` — so a bilingual list sends each person the
invitation in the one they read. Repeated names are skipped, because a guest invited twice
becomes two rows to reconcile later.

`out/guest-links.txt` has the WhatsApp message ready to paste for each guest, and
`out/qr-invitation.svg` is the gold QR of the live URL for the printed cards.

## Develop / rebuild

```bash
npm install
npm run dev      # local dev server
npm run check    # i18n parity, .ics validity, config sanity — also runs before every build
npm run build    # rebuilds into docs/, and regenerates the offline service worker
```

Two build steps are separate because they need python (`pip install pillow fonttools brotli`)
and their output is committed, so an ordinary rebuild does not need them:

```bash
npm run fonts    # rebuilds the self-hosted font subsets — RUN THIS after changing Sindhi text
npm run og       # rebuilds the WhatsApp link-preview image and the home-screen icons
```

The site is served from the committed `docs/` folder, so **a source change that was never
rebuilt ships nothing** — the old build keeps serving. `.github/workflows/check.yml` fails the
build if `docs/` has fallen behind `src/`.

### Offline

Once a guest has opened the invitation it works with no signal, and can be added to a phone's
home screen. The service worker is generated from the built output by `npm run build`; there is
nothing to configure.

## Structure
- `src/config.js` — the settings and the event's facts, in one place
- `src/App.jsx` — all sections, countdown, RSVP / calendar / map
- `src/components/Intro.jsx` — envelope + wax seal opening
- `src/components/ScratchHeart.jsx` — scratch-the-gold-foil heart date reveal
- `src/components/Rsvp.jsx`, `src/rsvp-store.js` — the reply, and getting it delivered
- `src/components/Sheet.jsx` — the bottom panel both the RSVP and the calendar chooser use
- `src/ics.js` — the calendar entry, built to RFC 5545 and checked by `npm run check`
- `src/i18n.js` — every English and Sindhi string
- `src/fonts.css`, `src/assets/fonts/` — generated; see `npm run fonts`
- `public/assets/` — card artwork, the ornament cut from it, share image and icons
- `scripts/` — the checks, font subsetting, share image, service worker, guest links, and the
  Google Apps Script
