#!/usr/bin/env python3
"""Cleans the Canva frame export into scripts/card/frame.png, the ground the card is set on.

canva-frame-raw.png is the Canva design "Pakistani Sindhi wedding invitation" (DAHaX0V1Flw),
exported at 1191 wide with every text layer deleted. Two things are done to it:

  * a stray wisp of flame Canva baked into the plain wine of the niche (left of centre, behind
    where "Baarat" sits) is replaced by the same patch from the other side of the arch, mirrored
    — the ground is symmetric, so the texture and the vignette carry straight across;
  * it is stretched from 1191 × 1667 to the card's 1191 × 1680 (0.8%, not visible).
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
im = Image.open(os.path.join(HERE, "canva-frame-raw.png")).convert("RGB")
a = np.asarray(im).astype(float)
W = a.shape[1]

x0, x1, y0, y1 = 420, 572, 420, 672
patch = a[y0:y1, W - x1:W - x0][:, ::-1]
# feather the edges so the seam disappears
h, w = y1 - y0, x1 - x0
fy = np.minimum(np.arange(h), np.arange(h)[::-1]) / 24
fx = np.minimum(np.arange(w), np.arange(w)[::-1]) / 24
m = np.clip(np.minimum(fy[:, None], fx[None, :]), 0, 1)[..., None]
a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - m) + patch * m

out = Image.fromarray(a.round().clip(0, 255).astype(np.uint8)).resize((1191, 1680), Image.LANCZOS)
out.save(os.path.join(HERE, "frame.png"), optimize=True)
print("wrote scripts/card/frame.png")
