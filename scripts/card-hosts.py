#!/usr/bin/env python3
"""Names the hosts on the invitation artwork, and makes the bride's side its own card.

There are two invitations now, one from each family:

  * the groom's side (the standard site, and card-print.png / card-web.webp):
        JALLAL HYDER & RUBINA / INVITE YOU TO THE / Baarat & Rukhsati /
        TASHKEEN / their son / & / ANUSHA / daughter of Barkat Ali & Mumtaz
  * the bride's side (the /bridal/ site, and card-print-bridal.png / card-web-bridal.webp):
        BARKAT ALI & MUMTAZ / INVITE YOU TO THE / Baarat & Rukhsati /
        ANUSHA / their daughter / & / TASHKEEN / son of Jallal Hyder & Rubina

"TOGETHER WITH THEIR FAMILIES" is lifted and the hosts set in its place, on two lines of the same
small caps at the same size, tracking and gold, in the clear ground between the bismillah and the
title, the second a step smaller. "their son" / "their daughter" are set in the italic of the line they replace.

The two names and "son of Jallal Hyder & Rubina" are not re-typeset at all on the bride's card:
each is lifted off its own ground as ink (the line minus the gradient under it) and laid onto
the ground of the place it moves to. The ground is a smooth vertical gradient (see CLAUDE.md), so
the type moves and the wine under it stays where it was. Nothing below the second subtitle moves,
so DateMask's measurements of the date line still hold on both cards.

Every figure is measured off each cut on its own terms — card-web.webp is a separate, flatter
rendering, not a resize of the master. It always starts from the artwork in git at ORIGINAL, never
from its own output, so running it twice gives the same files. Needs pillow, numpy and fonttools.
"""
import io
import os
import subprocess
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS = os.path.join(ROOT, "node_modules/@fontsource")
CAPS = f"{FS}/cormorant-sc/files/cormorant-sc-latin-600-normal.woff2"
ITALIC = f"{FS}/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2"

ORIGINAL = "89d2b1b"   # "Baarat" over "& Rukhsati", "TOGETHER WITH THEIR FAMILIES" above it

OLD_KICKER = "TOGETHER WITH THEIR FAMILIES"
OLD_SUB = "son of Jallal Hyder & Rubina"
SIDES = {
    "groom": dict(hosts="JALLAL HYDER & RUBINA", sub="their son", swap=False, suffix=""),
    "bride": dict(hosts="BARKAT ALI & MUMTAZ", sub="their daughter", swap=True, suffix="-bridal"),
}
SECOND = "INVITE YOU TO THE"

# Ink rows of each line, measured on each cut, and the columns every line of the block lies
# inside (clear of the arch, and of the faint gold hairline at x=912 / 689 beside the first name).
CUTS = [
    dict(path="public/assets/card-print.png", fmt="png", centre=596, cols=(296, 896),
         bis=(505, 528), bis_up=5, title_top=613, kicker=(578, 594), kicker_cols=(336, 855),
         name1=(860, 904), sub1=(940, 969), sub1_cols=(432, 757), name2=(1070, 1114), sub2=(1150, 1179)),
    dict(path="src/assets/card-web.webp", fmt="webp", centre=450, cols=(225, 675),
         bis=(382, 399), bis_up=4, title_top=464, kicker=(437, 449), kicker_cols=(247, 653),
         name1=(650, 683), sub1=(710, 732), sub1_cols=(327, 571), name2=(809, 842), sub2=(869, 891)),
]
PAD = 5


@lru_cache(maxsize=None)
def sfnt(path):
    buf = io.BytesIO()
    TTFont(path).save(buf)          # @fontsource ships woff2; PIL wants a plain sfnt
    return buf.getvalue()


@lru_cache(maxsize=None)
def face(path, size):
    return ImageFont.truetype(io.BytesIO(sfnt(path)), size)


def render(text, font, track=0.0):
    """The text as a float alpha mask on a fixed origin, and its ink box."""
    im = Image.new("L", (int(font.size * (len(text) + 4)), int(font.size * 3)), 0)
    d = ImageDraw.Draw(im)
    x = font.size
    for ch in text:
        d.text((x, font.size), ch, font=font, fill=255)
        x += d.textlength(ch, font=font) + track
    return np.asarray(im).astype(float) / 255, im.getbbox()


def ink_ramp(a, rows, cols):
    """The ink colour row by row, from the brightest few per cent of each row of the glyphs."""
    out = []
    for y in range(rows[0], rows[1] + 1):
        px = a[y, cols[0]:cols[1] + 1]
        lum = px.mean(1)
        out.append(px[lum >= np.percentile(lum, 97)].mean(0))
    return np.array(out)


def ground(a, y0, y1, x0, x1):
    """The wine under a band, from the clean rows just outside it."""
    top, bot = a[y0 - 2, x0:x1 + 1], a[y1 + 2, x0:x1 + 1]
    f = ((np.arange(y0, y1 + 1) - (y0 - 2)) / ((y1 + 2) - (y0 - 2)))[:, None, None]
    return top[None] + (bot - top)[None] * f


def lift(a, rows, cols):
    """Erase a band, and hand back its ink (the band minus its ground) to be laid elsewhere."""
    y0, y1 = rows[0] - PAD, rows[1] + PAD
    g = ground(a, y0, y1, *cols)
    ink = a[y0:y1 + 1, cols[0]:cols[1] + 1] - g
    a[y0:y1 + 1, cols[0]:cols[1] + 1] = g
    return ink


def lay(a, ink, top_row, cols):
    y0 = top_row - PAD
    a[y0:y0 + ink.shape[0], cols[0]:cols[1] + 1] += ink


def place(a, m, bbox, ramp, top, centre):
    """Set a rendered line with its ink top at `top`, centred, in the given colour ramp."""
    m = m[bbox[1]:bbox[3], bbox[0]:bbox[2]]
    h, w = m.shape
    x = round(centre - w / 2)
    idx = np.linspace(0, len(ramp) - 1, h).round().astype(int)
    al = m[:, :, None]
    a[top:top + h, x:x + w] = a[top:top + h, x:x + w] * (1 - al) + ramp[idx][:, None, :] * al
    return x, x + w


def build(cut, side):
    src = subprocess.run(["git", "show", f"{ORIGINAL}:{cut['path']}"], cwd=ROOT,
                         capture_output=True, check=True).stdout
    a = np.asarray(Image.open(io.BytesIO(src)).convert("RGB")).astype(float)
    c, cols = cut["centre"], cut["cols"]

    # ── the hosts, in place of TOGETHER WITH THEIR FAMILIES ──
    k0, k1 = cut["kicker"]
    kramp = ink_ramp(a, cut["kicker"], cut["kicker_cols"])
    cap = k1 - k0 + 1
    size = min(range(8, 80), key=lambda s: abs((lambda bb: bb[3] - bb[1])(render("T", face(CAPS, s))[1]) - cap))
    font = face(CAPS, size)
    _, bb = render(OLD_KICKER, font)
    track = ((cut["kicker_cols"][1] - cut["kicker_cols"][0] + 1) - (bb[2] - bb[0])) / (len(OLD_KICKER) - 1)
    lift(a, cut["kicker"], (cut["kicker_cols"][0] - 12, cut["kicker_cols"][1] + 12))
    # the bismillah steps up a few pixels toward the star, which has room to spare, to give the
    # two host lines the ground between it and the title
    b0, b1 = cut["bis"]
    lay(a, lift(a, cut["bis"], cols), b0 - cut["bis_up"], cols)
    bis_end = b1 - cut["bis_up"]
    # the hosts at the kicker's own size; "invite you to the" a step smaller under them
    small = face(CAPS, round(size * 0.82))
    lines = [render(side["hosts"], font, track), render(SECOND, small, track * 0.82)]
    gap = round(cap * 0.6)
    hs = [l[1][3] - l[1][1] for l in lines]
    free = (cut["title_top"] - bis_end - 1) - sum(hs) - gap
    top = bis_end + 1 + round(free / 2)
    assert free / 2 > cap * 0.7, f"{cut['path']}: the hosts do not fit above the title"
    for (m, b), h in zip(lines, hs):
        l, r = place(a, m, b, kramp, top, c)
        assert cols[0] - 40 < l and r < cols[1] + 40, f"{cut['path']}: '{side['hosts']}' outruns the arch"
        top += h + gap

    # ── the names, and the line under the host's child ──
    sramp = ink_ramp(a, cut["sub1"], cut["sub1_cols"])
    want = cut["sub1_cols"][1] - cut["sub1_cols"][0] + 1
    isize = min(range(8, 90), key=lambda s: abs((lambda bb: bb[2] - bb[0])(render(OLD_SUB, face(ITALIC, s))[1]) - want))
    ifont = face(ITALIC, isize)
    _, ref = render(OLD_SUB, ifont)
    m, nb = render(side["sub"], ifont)
    sub_top = cut["sub1"][0] + (nb[1] - ref[1])          # same baseline as the line it replaces

    if side["swap"]:
        n1, s1 = lift(a, cut["name1"], cols), lift(a, cut["sub1"], cols)
        n2 = lift(a, cut["name2"], cols)
        lift(a, cut["sub2"], cols)
        lay(a, n2, cut["name1"][0], cols)                   # ANUSHA first
        lay(a, n1, cut["name2"][0], cols)                   # then TASHKEEN
        lay(a, s1, cut["sub2"][0], cols)                    # with "son of Jallal Hyder & Rubina"
    else:
        lift(a, cut["sub1"], cols)
    place(a, m, nb, sramp, sub_top, c)

    out = os.path.join(ROOT, cut["path"].replace(".", side["suffix"] + ".", 1) if side["suffix"] else cut["path"])
    im = Image.fromarray(np.clip(a, 0, 255).round().astype(np.uint8))
    if cut["fmt"] == "png":
        im.save(out, format="PNG", optimize=True)
    else:
        im.save(out, format="WEBP", quality=90, method=6)
    print(f"{os.path.relpath(out, ROOT)}: hosts {size}px +{track:.1f}px tracking, '{side['sub']}' {isize}px italic")


for name, side in SIDES.items():
    for cut in CUTS:
        build(cut, side)
