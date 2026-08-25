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

### Personalised guest links
Append `?to=Name` for each guest:
`https://<you>.github.io/shaadi/?to=Ahmed` → the envelope greets "Dear Ahmed," and the closing
section signs off to them by name.

To do a whole guest list at once, put one name per line in `guests.txt` and run:

```bash
npm run links                 # → out/guest-links.csv, out/guest-links.txt, out/qr-invitation.svg
npm run links -- --qr-each    # also one QR code per guest, for place cards
```

`out/guest-links.txt` has the WhatsApp message ready to paste for each guest, and
`out/qr-invitation.svg` is the gold QR of the live URL for the printed cards.

### RSVP
Two settings at the top of `src/App.jsx`, both currently empty:

- `RSVP_PHONE` — the family WhatsApp number, digits only, e.g. `"923001234567"`.
- `RSVP_ENDPOINT` — a Google Apps Script web app URL ending in `/exec`, which writes each reply
  as a row in a Google Sheet. The script and its five-minute setup are in
  `scripts/rsvp-sheet.gs`.

Every reply goes to both. Replies are saved on the guest's phone first and retried until the
Sheet confirms them, so a dropped connection does not lose one. Rebuild after changing either.

## Develop / rebuild

```bash
npm install
npm run dev      # local dev server
npm run build    # rebuilds into docs/, and regenerates the offline service worker
```

Two build steps are separate because they need python (`pip install pillow fonttools brotli`)
and their output is committed, so an ordinary rebuild does not need them:

```bash
npm run fonts    # rebuilds the self-hosted font subsets — RUN THIS after changing Sindhi text
npm run og       # rebuilds the WhatsApp link-preview image and the home-screen icons
```

### Offline

Once a guest has opened the invitation it works with no signal, and can be added to a phone's
home screen. The service worker is generated from the built output by `npm run build`; there is
nothing to configure.

## Structure
- `src/App.jsx` — all sections, countdown, RSVP/calendar/map
- `src/components/Intro.jsx` — envelope + wax seal opening
- `src/components/ScratchHeart.jsx` — scratch-the-gold-foil heart date reveal
- `src/i18n.js` — every English and Sindhi string
- `src/fonts.css`, `src/assets/fonts/` — generated; see `npm run fonts`
- `public/assets/` — card artwork, the ornament cut from it, share image and icons
- `scripts/` — font subsetting, share image, service worker, guest links
