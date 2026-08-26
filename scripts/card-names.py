#!/usr/bin/env python3
"""Re-sets the two name lines on the invitation artwork, so each name carries its surname.

The card was hand-typeset once with PIL — Canva's baked text erased and the lines re-set in
Italianno and Cormorant SC — and this is that same operation for the two name lines, kept as a
script this time so it can be re-run instead of redone by hand.

It rewrites both cuts in place:

    public/assets/card-print.png   the 1191x1680 master, and what the download button hands over
    src/assets/card-web.webp      the 900x1270 cut the page itself shows

They are not one picture at two sizes. The web cut is a separate, flatter rendering with a
brighter wine and a paler cream, so each is measured and re-set on its own terms rather than
resized out of the other.

Safe to run twice: each erase box is drawn wide enough to take in the text this script itself
sets, so a second run lifts the first run's names and re-sets them identically.

Two things not to disturb:
  · The date line below. DateMask's percentages in styles.css are measured off it, and all of
    them would have to be re-measured if it moved.
  · A faint gold hairline in the artwork at x=912 (print) / x=689 (web), which runs down past the
    first name but stops above the second. The first name is kept clear of it — that is what
    `limit` is for below, and why the two names are not tracked as widely as they were.

Run with `npm run card`. Needs pillow + fonttools.
"""
import io
import os
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = "node_modules/@fontsource/cormorant-sc/files/cormorant-sc-latin-600-normal.woff2"

# Letter-spacing, as a fraction of the size. The lines were set at about .10em before the
# surnames; the fit below gives that back where the artwork has room for it.
TRACK_EM = 0.10

# Every measurement here was taken off the artwork itself, not chosen: `top` and `cap` are the
# ink band of the name being replaced, `centre` the axis the card's other lines are centred on,
# `ink` its cream sampled from the glyphs, and `limit` the furthest the line may reach from the
# centre before it meets the hairline or the arch. `box` is erased and re-set.
CUTS = [
    dict(path="public/assets/card-print.png", save=dict(format="PNG", optimize=True),
         centre=596, ink=(247, 231, 196), seam=(907, 918, 840, 1000),
         rows=[dict(text="TASHKEEN SYED", top=859, cap=46, limit=306, box=(200, 845, 906, 918)),
               dict(text="ANUSHA NIZAMANI", top=1070, cap=45, limit=426, box=(180, 1055, 1012, 1128))]),
    dict(path="src/assets/card-web.webp", save=dict(format="WEBP", quality=90, method=6),
         centre=450, ink=(255, 238, 214), seam=(684, 695, 632, 760),
         rows=[dict(text="TASHKEEN SYED", top=650, cap=34, limit=231, box=(150, 640, 684, 694)),
               dict(text="ANUSHA NIZAMANI", top=809, cap=34, limit=320, box=(135, 799, 765, 852))]),
]


@lru_cache(maxsize=None)
def sfnt():
    """@fontsource ships woff2; PIL wants a real sfnt, so unpack it once on the way through."""
    buf = io.BytesIO()
    TTFont(os.path.join(ROOT, FONT)).save(buf)
    return buf.getvalue()


@lru_cache(maxsize=None)
def face(size):
    return ImageFont.truetype(io.BytesIO(sfnt()), size)


def cap_height(font, probe=ImageDraw.Draw(Image.new("RGB", (8, 8)))):
    box = probe.textbbox((0, 0), "T", font=font)
    return box[3] - box[1]


@lru_cache(maxsize=None)
def size_for(cap):
    """The size whose capitals stand exactly as tall as the ones being replaced."""
    return min(range(20, 120), key=lambda s: (abs(cap_height(face(s)) - cap), s))


def set_line(text, font, tracking, ink, size):
    """The line on its own transparent layer, so its ink box can be measured and then placed."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = size[0] * 0.1
    for c in text:
        d.text((x, size[1] * 0.3), c, font=font, fill=ink + (255,))
        x += d.textlength(c, font=font) + tracking
    return layer, layer.getbbox()


def erase(img, box):
    """Lift the old line off the wine. The ground under it is a smooth vertical gradient, so each
    column is re-drawn from the clean rows just outside the box — measured at under 10/255 against
    the real thing over a band this size, which on wine this dark is nothing."""
    px = img.load()
    x0, y0, x1, y1 = box
    top, bot = y0 - 2, y1 + 2
    for x in range(x0, x1 + 1):
        a, b = px[x, top], px[x, bot]
        for y in range(y0, y1 + 1):
            f = (y - top) / (bot - top)
            px[x, y] = tuple(round(p + (q - p) * f) for p, q in zip(a, b))


def unseam(img, seam):
    """A soft gold streak sits in both cuts at the height of the first name — the edge of an
    older erase, left over from when the card was first re-typeset, with no counterpart on the
    other side of the card. It stood in clear space until the first name grew a surname and
    reached out to meet it. Each row is redrawn from the clean columns either side, and only
    where both of those really are wine, so nothing that is ink is ever touched."""
    px = img.load()
    x0, x1, y0, y1 = seam
    for y in range(y0, y1 + 1):
        a, b = px[x0, y], px[x1, y]
        if max(sum(a), sum(b)) / 3 > 60:
            continue
        for x in range(x0 + 1, x1):
            f = (x - x0) / (x1 - x0)
            px[x, y] = tuple(round(p + (q - p) * f) for p, q in zip(a, b))


def line_width(row, em):
    size = size_for(row["cap"])
    _, bb = set_line(row["text"], face(size), size * em, (255, 255, 255), (2400, 400))
    return bb[2] - bb[0]


def tracking_for(cut, em):
    """The widest tracking at or under `em` that keeps every line inside its limit."""
    while em > 0.02:
        if all(line_width(row, em) <= row["limit"] * 2 for row in cut["rows"]):
            return em
        em -= 0.005
    raise SystemExit("no tracking fits the artwork — the names are too long for the card")


# One tracking for the whole card, and the same one on both cuts, or the two would not match.
em = min(tracking_for(cut, TRACK_EM) for cut in CUTS)
print(f"letter-spacing {em:.3f}em")

for cut in CUTS:
    path = os.path.join(ROOT, cut["path"])
    img = Image.open(path).convert("RGB")
    unseam(img, cut["seam"])
    for row in cut["rows"]:
        erase(img, row["box"])
        size = size_for(row["cap"])
        layer, bb = set_line(row["text"], face(size), size * em, cut["ink"], img.size)
        dx = round(cut["centre"] - (bb[0] + bb[2]) / 2)
        dy = round(row["top"] - bb[1])
        cut_out = layer.crop(bb)
        img.paste(cut_out, (bb[0] + dx, bb[1] + dy), cut_out)
        x0, y0, x1, y1 = row["box"]
        assert x0 <= bb[0] + dx and bb[2] + dx <= x1, f"{row['text']} outruns its erase box"
        print(f"  {row['text']:<16} size {size}  x {bb[0]+dx}–{bb[2]+dx}  cap top {row['top']}")
    img.save(path, **cut["save"])
    print(f"{cut['path']}  {os.path.getsize(path) / 1024:.0f} KB")
