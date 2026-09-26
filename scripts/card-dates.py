#!/usr/bin/env python3
"""Re-sets the date-and-venue block at the foot of the invitation artwork for two evenings.

The card used to close on one date and one hall:

    SUNDAY · 27 DECEMBER 2026
    Nerunkot Hall, Qasimabad · Hyderabad

The Rukhsati is on the 27th in Hyderabad and the Walima on the 29th in Thatta, so it now reads

    27 & 29 DECEMBER 2026
    Rukhsati · Nerunkot Hall, Qasimabad · Hyderabad
    Walima · Zam Zam Hall · Thatta

The caps line keeps its place, its size and its tracking exactly, and stays one line on purpose:
it is the line DateMask covers until the heart is scratched, and the band's percentages in
styles.css are measured off it. The new line is shorter than the old one, so the band still
covers it with room to spare. The venues are not secret and sit below it, clear of the band.

It rewrites both cuts in place, each measured against its own ground — card-web.webp is not a
resize of card-print.png but a separate, flatter rendering (see scripts/card-names.py at 5e2a7cd
for the same operation on the name lines):

    public/assets/card-print.png   the 1191x1680 master, and what the download button hands over
    src/assets/card-web.webp      the 900x1270 cut the page itself shows

The faces, sizes and tracking below were fitted to the lines they replace — rendered and
correlated against the artwork's own ink — not chosen by eye. The baselines are measured the same
way: the old line is rendered at the fitted size and slid over the original until it lands, and the
new line is set on that baseline. So a line the card already had is replaced by one standing on
the same baseline in the same type, and only the words change.

Not idempotent: it measures the old lines off the artwork, so run it against the original cut
(git checkout the two files first) rather than twice in a row.

Needs pillow, fonttools and numpy.
"""
import io
import os
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SC = "node_modules/@fontsource/cormorant-sc/files/cormorant-sc-latin-600-normal.woff2"
IT = "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-{w}-italic.woff2"

OLD_CAPS, NEW_CAPS = "SUNDAY · 27 DECEMBER 2026", "27 & 29 DECEMBER 2026"
OLD_VENUE = "Nerunkot Hall, Qasimabad · Hyderabad"
NEW_VENUES = ("Rukhsati · Nerunkot Hall, Qasimabad · Hyderabad", "Walima · Zam Zam Hall · Thatta")

# `caps` / `venue`: the box each old line sits in, found by ink rows (76.5–78.2% and 79.7–81.6%
# of the height in both cuts). `sc` / `it`: (size, tracking px) fitted to that line. `leading`:
# baseline to baseline between the two italic lines, in the proportion the "son of / &" block
# above keeps. `centre`: the axis every line on the card is centred on.
CUTS = [
    dict(path="public/assets/card-print.png", save=dict(format="PNG", optimize=True),
         centre=596, caps=(290, 1280, 900, 1320), venue=(250, 1333, 942, 1378),
         sc=(37, 3.0), it=(32, 0.2, 600), leading=46),
    dict(path="src/assets/card-web.webp", save=dict(format="WEBP", quality=90, method=6),
         centre=450, caps=(215, 966, 685, 999), venue=(188, 1006, 712, 1042),
         sc=(28, 2.2), it=(24, 0.3, 400), leading=35),
]


@lru_cache(maxsize=None)
def sfnt(path):
    """@fontsource ships woff2; PIL wants a real sfnt, so unpack it once on the way through."""
    buf = io.BytesIO()
    TTFont(os.path.join(ROOT, path)).save(buf)
    return buf.getvalue()


def face(path, size):
    return ImageFont.truetype(io.BytesIO(sfnt(path)), size)


def layout(text, font, tracking):
    """Glyph origins for a tracked line — PIL has no letter-spacing, so it is laid a glyph at a
    time. Returns the layer (white ink on transparent, baseline at y=BASE) and its ink box."""
    layer = Image.new("L", (2400, 240), 0)
    d = ImageDraw.Draw(layer)
    x = 100
    for c in text:
        d.text((x, BASE), c, font=font, fill=255, anchor="ls")
        x += d.textlength(c, font=font) + tracking
    return layer, layer.getbbox()


BASE = 160


def ground_mask(img, box):
    g = np.asarray(img.convert("L").crop(box)).astype(float)
    return g > np.median(g) + 45


def find_baseline(img, box, text, font, tracking):
    """Where the old line stands: its rendered ink box aligned to the artwork's ink box."""
    m = ground_mask(img, box)
    ys, xs = np.where(m)
    _, bb = layout(text, font, tracking)
    return box[1] + ys.min() + (BASE - bb[1])


def ink_colour(img, box):
    """The line's own gold, sampled from its densest glyph pixels."""
    a = np.asarray(img.convert("RGB").crop(box)).reshape(-1, 3).astype(float)
    lum = a.mean(axis=1)
    top = a[lum >= np.percentile(lum, 99.3)]
    return tuple(int(round(v)) for v in np.median(top, axis=0))


def erase(img, box):
    """Lift the old line off the wine. The ground under it is a smooth vertical gradient, so each
    column is redrawn from the clean rows just outside the box."""
    px = img.load()
    x0, y0, x1, y1 = box
    top, bot = y0 - 2, y1 + 2
    for x in range(x0, x1 + 1):
        a, b = px[x, top], px[x, bot]
        for y in range(y0, y1 + 1):
            f = (y - top) / (bot - top)
            px[x, y] = tuple(round(p + (q - p) * f) for p, q in zip(a, b))


def stamp(img, text, font, tracking, ink, centre, baseline):
    layer, bb = layout(text, font, tracking)
    dx = round(centre - (bb[0] + bb[2]) / 2)
    dy = baseline - BASE
    ink_layer = Image.new("RGB", layer.size, ink)
    img.paste(ink_layer.crop(bb), (bb[0] + dx, bb[1] + dy), layer.crop(bb))
    return (bb[0] + dx, bb[1] + dy, bb[2] + dx, bb[3] + dy)


for cut in CUTS:
    path = os.path.join(ROOT, cut["path"])
    img = Image.open(path).convert("RGB")
    sc = face(SC, cut["sc"][0])
    size, track, weight = cut["it"]
    it = face(IT.format(w=weight), size)

    caps_base = find_baseline(img, cut["caps"], OLD_CAPS, sc, cut["sc"][1])
    venue_base = find_baseline(img, cut["venue"], OLD_VENUE, it, track)
    caps_ink, venue_ink = ink_colour(img, cut["caps"]), ink_colour(img, cut["venue"])

    erase(img, cut["caps"])
    erase(img, cut["venue"])

    print(cut["path"])
    got = stamp(img, NEW_CAPS, sc, cut["sc"][1], caps_ink, cut["centre"], caps_base)
    print(f"  {NEW_CAPS:<48} {got}  {got[1] / img.height:.1%}–{got[3] / img.height:.1%}")
    x0, _, x1, _ = cut["caps"]
    assert x0 < got[0] and got[2] < x1, "the caps line outruns the ground it was erased from"
    for i, line in enumerate(NEW_VENUES):
        got = stamp(img, line, it, track, venue_ink, cut["centre"], venue_base + i * cut["leading"])
        print(f"  {line:<48} {got}  {got[1] / img.height:.1%}–{got[3] / img.height:.1%}")
    img.save(path, **cut["save"])
    print(f"  {os.path.getsize(path) / 1024:.0f} KB")
