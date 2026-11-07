#!/usr/bin/env python3
"""Takes "& Walima" off the invitation artwork and centres "Rukhsati" on its own.

The invitation is for the Rukhsati alone. Nothing is re-typeset: the Italianno "Rukhsati" that
is already on the card is lifted and moved, so the letterforms are exactly the ones the rest of
the card was set beside.

  1. The ground under the whole title line is rebuilt column by column from the clean rows just
     above and below it — it is a smooth vertical gradient, so this is invisible (see CLAUDE.md).
  2. The word's ink is taken as its difference from that rebuilt ground, and added back onto the
     ground `dx` pixels to the right. Moving the difference rather than the pixels means the
     card's horizontal vignette never travels with the word.

Both cuts are done on their own terms — card-web.webp is a separate rendering, not a resize.
The date line is far below and untouched, so DateMask's measurements still hold.

One-shot: it refuses to run once "& Walima" is gone. Needs pillow + numpy.
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# box: the whole title line, erased. word: the columns of "Rukhsati" in it. walima: columns that
# only "& Walima" occupies, used to tell whether this has already been done. centre: the axis
# every other line on the card is centred on.
CUTS = [
    dict(path="public/assets/card-print.png", save=dict(format="PNG", optimize=True),
         box=(190, 630, 1000, 750), word=(203, 565), walima=(600, 980), centre=596),
    dict(path="src/assets/card-web.webp", save=dict(format="WEBP", quality=90, method=6),
         box=(140, 478, 758, 566), word=(152, 431), walima=(450, 740), centre=450),
]

for cut in CUTS:
    path = os.path.join(ROOT, cut["path"])
    a = np.asarray(Image.open(path).convert("RGB")).astype(float)
    x0, y0, x1, y1 = cut["box"]
    top, bot = a[y0 - 2, x0:x1 + 1], a[y1 + 2, x0:x1 + 1]
    f = ((np.arange(y0, y1 + 1) - (y0 - 2)) / ((y1 + 2) - (y0 - 2)))[:, None, None]
    ground = top[None] + (bot - top)[None] * f

    region = a[y0:y1 + 1, x0:x1 + 1]
    w0, w1 = cut["walima"][0] - x0, cut["walima"][1] - x0
    if (region[:, w0:w1].sum(2) > 300).sum() < 50:
        sys.exit(f"{cut['path']}: '& Walima' is already gone — nothing to do")

    ink = np.zeros_like(region)
    s0, s1 = cut["word"][0] - x0, cut["word"][1] - x0
    ink[:, s0:s1 + 1] = region[:, s0:s1 + 1] - ground[:, s0:s1 + 1]

    cols = np.where((np.abs(ink).sum(2) > 60).any(0))[0]
    dx = round(cut["centre"] - (cols.min() + cols.max()) / 2 - x0)
    moved = np.zeros_like(ink)
    moved[:, max(0, dx):] = ink[:, :ink.shape[1] - max(0, dx)]
    assert (np.abs(moved[:, :2]).sum() == 0) and (np.abs(moved[:, -2:]).sum() == 0), "outruns box"

    a[y0:y1 + 1, x0:x1 + 1] = np.clip(ground + moved, 0, 255)
    Image.fromarray(a.round().astype(np.uint8)).save(path, **cut["save"])
    print(f"{cut['path']}: Rukhsati {cols.min() + x0}–{cols.max() + x0} moved {dx:+d}px "
          f"to {cols.min() + x0 + dx}–{cols.max() + x0 + dx}")
