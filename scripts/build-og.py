#!/usr/bin/env python3
"""Builds the link-preview image at public/assets/og-card.jpg.

og:image used to point at card-print.png — a 2.1 MB portrait scan. WhatsApp, which is how this
invitation actually travels, drops previews well before that size and crops to landscape, so most
guests were seeing a bare link. This draws a 1200x630 card in the same palette and the same faces
as the site, and keeps it under 200 KB.

Run with `npm run og`. Needs pillow + fonttools; the output is committed.
"""
import io
import os
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public/assets/og-card.jpg")
W, H = 1200, 630

WINE_IN = (109, 22, 39)
WINE_OUT = (26, 6, 14)
GOLD = (233, 200, 126)
GOLD_PALE = (247, 227, 181)
CHALK = (247, 239, 225)
GOLD_L = (196, 158, 92)        # --gold-l, the small caps and kickers
# the words the band on the card carries — i18n.js `maskHint`, upper-cased as the kickers are
MASK_HINT = "SCRATCH THE HEART TO FIND OUT THE DATE"


def face(pkg, name, size):
    """@fontsource ships woff2; PIL wants a real sfnt, so unpack it on the way through."""
    src = os.path.join(ROOT, "node_modules/@fontsource", pkg, "files", name)
    buf = io.BytesIO()
    TTFont(src).save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def backdrop():
    """The same radial wine wash the sections use, drawn small and scaled up so it stays smooth."""
    sw, sh = 240, 126
    small = Image.new("RGB", (sw, sh))
    px = small.load()
    cx, cy = sw * 0.5, sh * 0.08
    far = ((sw * 0.75) ** 2 + (sh * 1.05) ** 2) ** 0.5
    for y in range(sh):
        for x in range(sw):
            d = min(1.0, (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / far)
            e = d ** 0.72
            px[x, y] = tuple(round(a + (b - a) * e) for a, b in zip(WINE_IN, WINE_OUT))
    return small.resize((W, H), Image.LANCZOS)


def tracked(d, x, y, text, font, fill, tracking):
    """Letter-spacing, which PIL has no notion of — laid out a glyph at a time."""
    for c in text:
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + tracking


def tracked_width(d, text, font, tracking):
    return sum(d.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)


def centred(d, y, text, font, fill, tracking=0):
    if tracking:
        tracked(d, (W - tracked_width(d, text, font, tracking)) / 2, y, text, font, fill, tracking)
        return
    d.text((W / 2, y), text, font=font, fill=fill, anchor="ma")


img = backdrop()
draw = ImageDraw.Draw(img)

# the ornament cut from the card artwork, so the preview and the site share an edge
orn = Image.open(os.path.join(ROOT, "src/assets/orn-corner.webp")).convert("RGBA")
orn = orn.resize((232, 232), Image.LANCZOS)
# feather the inner edges so the ornament dissolves into the wash instead of ending on a seam
alpha = orn.getchannel("A").point(lambda a: int(a * 0.5))
fade = Image.new("L", alpha.size, 255)
fd = fade.load()
FEATHER = 96
for y in range(alpha.size[1]):
    fy = min(1.0, (alpha.size[1] - y) / FEATHER)
    for x in range(alpha.size[0]):
        fx = min(1.0, (alpha.size[0] - x) / FEATHER)
        fd[x, y] = int(255 * min(fx, fy))
alpha = Image.frombytes("L", alpha.size, bytes(
    (a * f) // 255 for a, f in zip(alpha.tobytes(), fade.tobytes())))
faded = orn.copy()
faded.putalpha(alpha)
img.paste(faded, (0, 0), faded)
tr = faded.transpose(Image.FLIP_LEFT_RIGHT)
img.paste(tr, (W - 232, 0), tr)
bl = faded.transpose(Image.FLIP_TOP_BOTTOM)
img.paste(bl, (0, H - 232), bl)
br = faded.transpose(Image.ROTATE_180)
img.paste(br, (W - 232, H - 232), br)

# the gilt double rule
draw.rectangle([34, 34, W - 35, H - 35], outline=GOLD, width=2)
draw.rectangle([44, 44, W - 45, H - 45], outline=(150, 120, 70), width=1)

sc = lambda s: face("cormorant-sc", "cormorant-sc-latin-600-normal.woff2", s)
it = lambda s: face("italianno", "italianno-latin-400-normal.woff2", s)
cg = lambda s: face("cormorant-garamond", "cormorant-garamond-latin-400-normal.woff2", s)

centred(draw, 118, "THE RUKHSATI & WALIMA OF", sc(30), GOLD, tracking=7)
centred(draw, 168, "Tashkeen & Anusha", it(150), GOLD_PALE)

draw.line([(W / 2 - 190, 392), (W / 2 + 190, 392)], fill=(150, 120, 70), width=1)
for cxx in (W / 2 - 205, W / 2 + 205):
    draw.ellipse([cxx - 3, 389, cxx + 3, 395], fill=GOLD)

# "SUNDAY · 27 DECEMBER 2026" used to be the line under the rule. WhatsApp is how this invitation
# travels, so the preview was handing every guest the date before they had opened anything, and the
# scratch heart on s2 was revealing something they already knew. The venue takes that place — it is
# the fact a guest needs — and the hint sits below it as a quiet kicker, in --gold-l small caps,
# where it explains the absence without becoming the loudest thing on the card. The one rule above
# is enough ornament for this half; a second pair of hairlines around the hint only crowded it.
centred(draw, 428, "NERUNKOT HALL · QASIMABAD · HYDERABAD", cg(32), (222, 199, 180), tracking=3)
centred(draw, 502, MASK_HINT, sc(21), GOLD_L, tracking=5)

img.save(OUT, "JPEG", quality=86, optimize=True, progressive=True)
size = os.path.getsize(OUT)
print(f"{OUT.replace(ROOT + '/', '')}  {W}x{H}  {size / 1024:.1f} KB")
if size > 200 * 1024:
    raise SystemExit("over the 200 KB budget WhatsApp previews want")

# ── home-screen icons ──────────────────────────────────────────────────────────
# The invitation is installable, so it needs a real icon rather than the inline SVG favicon.
# the favicon's silhouette, as its four cubic segments — control points, not vertices
HEART = [
    ((50, 79), (24, 62), (21.5, 41.5), (33, 32.5)),
    ((33, 32.5), (43.5, 24.5), (50, 36), (50, 42.5)),
    ((50, 42.5), (50, 36), (56.5, 24.5), (67, 32.5)),
    ((67, 32.5), (78.5, 41.5), (76, 62), (50, 79)),
]


def heart_points(steps=64):
    out = []
    for p0, p1, p2, p3 in HEART:
        for i in range(steps):
            t = i / steps
            u = 1 - t
            out.append(tuple(
                u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d
                for a, b, c, d in zip(p0, p1, p2, p3)))
    return out


def icon(px, maskable=False):
    """Gold heart on wine. The maskable cut keeps everything inside the 80% safe circle."""
    im = Image.new("RGB", (px, px), (77, 14, 28))
    d = ImageDraw.Draw(im)
    scale = px / 100 * (0.74 if maskable else 1.0)
    off = (px - 100 * scale) / 2
    # the same silhouette as the favicon, traced as a filled polygon
    pts = [(off + x * scale, off + y * scale) for x, y in heart_points()]
    d.polygon(pts, fill=(233, 200, 126))
    if not maskable:
        mask = Image.new("L", (px, px), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, px - 1, px - 1], radius=px * 0.22, fill=255)
        out = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        out.paste(im, (0, 0), mask)
        return out
    return im.convert("RGBA")


for px in (192, 512):
    p = os.path.join(ROOT, f"public/assets/icon-{px}.png")
    icon(px).save(p, "PNG", optimize=True)
    print(f"public/assets/icon-{px}.png  {os.path.getsize(p) / 1024:.1f} KB")
p = os.path.join(ROOT, "public/assets/icon-maskable-512.png")
icon(512, maskable=True).save(p, "PNG", optimize=True)
print(f"public/assets/icon-maskable-512.png  {os.path.getsize(p) / 1024:.1f} KB")
