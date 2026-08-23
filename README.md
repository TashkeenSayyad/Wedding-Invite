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
`https://<you>.github.io/shaadi/?to=Ahmed` → the envelope greets "Dear Ahmed,"

### RSVP number
Open `src/App.jsx`, set `RSVP_PHONE` (digits only, e.g. `"923001234567"`), then rebuild.

## Develop / rebuild

```bash
npm install
npm run dev      # local dev server
npm run build    # rebuilds into docs/
```

## Structure
- `src/App.jsx` — all sections, countdown, RSVP/share/calendar
- `src/components/Intro.jsx` — envelope + wax seal opening
- `src/components/ScratchHeart.jsx` — scratch-the-gold-foil heart date reveal
- `src/i18n.js` — every English and Sindhi string
- `public/assets/` — card artwork and ornament cut from it
