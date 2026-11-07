#!/usr/bin/env python3
"""Retitles the invitation artwork: "Baarat" over "& Rukhsati of Anusha", both in the title script.

The evening is the groom's side's Baarat, and the Rukhsati is Anusha's — so the card's title
line, which said only "Rukhsati", now says "Baarat", and a second, smaller line under it names
whose Rukhsati it is.

Nothing is guessed. Every size and colour is taken off the artwork itself:

  * "Baarat" is set in Italianno at the size that makes the word "Rukhsati" come out exactly as
    tall as the "Rukhsati" being replaced, and in that word's own gold, row by row — the
    original's ink is a vertical ramp, and the new word carries the same ramp.
  * "& Rukhsati of Anusha" is the same face and the same gold — the user asked for the Rukhsati
    not to be the small line. It is set a step under "Baarat" only because it is three times as
    long and has to fit between the arches.
  * The two lines share the clear ground between "TOGETHER WITH THEIR FAMILIES" and the divider,
    with equal space above, between and below them.

The ground under the title is a smooth vertical gradient, so the old line is lifted by redrawing
each column from the clean rows just above and below it (see CLAUDE.md). Both cuts are done on
their own terms: card-web.webp is a separate, flatter rendering, not a resize of the master.

Nothing below the divider moves, so DateMask's measurements of the date line still hold.

Safe to run twice: the erase box takes in everything this script sets. Needs pillow, numpy and
fonttools.
"""
import io
import os
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS = os.path.join(ROOT, "node_modules/@fontsource")
TITLE_FONT = f"{FS}/italianno/files/italianno-latin-400-normal.woff2"

TITLE = "Baarat"
SUB = "& Rukhsati of Anusha"

# sizes, as fractions of the size that set the original single "Rukhsati"
TITLE_SCALE, SUB_SCALE = 0.86, 0.66

# Measured off each cut (rows and columns of ink, scanning the clear ground between the arches):
#   centre  the axis every line on the card is centred on
#   ref     the "Rukhsati" title as it was: its ink rows, used to size and colour the new title
#   parent  the "son of Jallal Hyder & Rubina" line: its ink rows and columns, for the subtitle
#   erase   the box lifted: from below "TOGETHER WITH THEIR FAMILIES" to above the divider
#   title   where the new title's ink starts, and sub_base where the subtitle's ink ends
CUTS = [
    # above: last ink row of "TOGETHER WITH THEIR FAMILIES"; below: first ink row of the divider;
    # ref: the ink rows of the original "Rukhsati"; erase: the box lifted, inside above/below and
    # clear of the arches
    dict(path="public/assets/card-print.png", save=dict(format="PNG", optimize=True), centre=596,
         ref=(643, 726), above=594, below=797, erase=(232, 600, 960, 794)),
    dict(path="src/assets/card-web.webp", save=dict(format="WEBP", quality=90, method=6), centre=450,
         ref=(486, 549), above=451, below=601, erase=(176, 455, 724, 597)),
]


@lru_cache(maxsize=None)
def sfnt(path):
    buf = io.BytesIO()
    TTFont(path).save(buf)          # @fontsource ships woff2; PIL wants a plain sfnt
    return buf.getvalue()


@lru_cache(maxsize=None)
def face(path, size):
    return ImageFont.truetype(io.BytesIO(sfnt(path)), size)


def mask(text, font):
    """The text as an alpha mask, cropped to its ink."""
    w = int(font.getlength(text) + font.size * 2)
    h = int(font.size * 2.4)
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).text((font.size, font.size * 0.5), text, font=font, fill=255)
    return np.asarray(im.crop(im.getbbox())).astype(float) / 255


def fit(path, text, target, axis):
    """The size whose rendering of `text` matches `target` pixels tall (axis 0) or wide (1)."""
    return min(range(10, 260), key=lambda s: abs(mask(text, face(path, s)).shape[axis] - target))


def ground_of(a, box):
    x0, y0, x1, y1 = box
    top, bot = a[y0 - 2, x0:x1 + 1], a[y1 + 2, x0:x1 + 1]
    f = ((np.arange(y0, y1 + 1) - (y0 - 2)) / ((y1 + 2) - (y0 - 2)))[:, None, None]
    return top[None] + (bot - top)[None] * f


def ink_ramp(a, rows, cols):
    """The ink colour, row by row, taken from the solid middle of the glyphs (the brightest few
    per cent of each row), so anti-aliased edges do not dull it."""
    out = []
    for y in range(rows[0], rows[1] + 1):
        px = a[y, cols[0]:cols[1] + 1]
        lum = px.mean(1)
        out.append(px[lum >= np.percentile(lum, 97)].mean(0))
    return np.array(out)


def stretch(ramp, n):
    idx = np.linspace(0, len(ramp) - 1, n)
    return np.array([ramp[int(round(i))] for i in idx])


def place(a, m, ramp, top, centre):
    h, w = m.shape
    x = round(centre - w / 2)
    region = a[top:top + h, x:x + w]
    al = m[:, :, None]
    a[top:top + h, x:x + w] = region * (1 - al) + stretch(ramp, h)[:, None, :] * al
    return x, x + w


for cut in CUTS:
    p = os.path.join(ROOT, cut["path"])
    a = np.asarray(Image.open(p).convert("RGB")).astype(float)
    c = cut["centre"]
    x0, y0, x1, y1 = cut["erase"]

    r0, r1 = cut["ref"]
    base = fit(TITLE_FONT, "Rukhsati", r1 - r0 + 1, 0)

    # the gold ramp, from the first run of ink rows in the box — the title, whichever stands there
    lum = a[y0:y1 + 1, x0:x1 + 1].mean(2)
    rows = np.where((lum > 110).sum(1) > 3)[0]
    gaps = np.where(np.diff(rows) > 4)[0]
    rows = rows[:gaps[0] + 1] if len(gaps) else rows
    ramp = ink_ramp(a, (rows.min() + y0, rows.max() + y0), (x0, x1))

    a[y0:y1 + 1, x0:x1 + 1] = ground_of(a, cut["erase"])

    tm = mask(TITLE, face(TITLE_FONT, round(base * TITLE_SCALE)))
    sm = mask(SUB, face(TITLE_FONT, round(base * SUB_SCALE)))
    free = (cut["below"] - cut["above"] - 1) - tm.shape[0] - sm.shape[0]
    gap = free / 3
    assert gap > 8, f"{cut['path']}: the two lines do not fit between the rule and the divider"
    t_top = round(cut["above"] + 1 + gap)
    s_top = round(t_top + tm.shape[0] + gap)
    assert y0 <= t_top and s_top + sm.shape[0] <= y1, f"{cut['path']}: lines outrun the erase box"

    for name, (l, r) in (("title", place(a, tm, ramp, t_top, c)), ("second line", place(a, sm, ramp, s_top, c))):
        assert x0 < l and r < x1, f"{cut['path']}: {name} outruns the erase box"

    Image.fromarray(np.clip(a, 0, 255).round().astype(np.uint8)).save(p, **cut["save"])
    print(f"{cut['path']}: '{TITLE}' {round(base * TITLE_SCALE)}px rows {t_top}–{t_top + tm.shape[0] - 1}, "
          f"'{SUB}' {round(base * SUB_SCALE)}px rows {s_top}–{s_top + sm.shape[0] - 1}, gaps {gap:.0f}px")
