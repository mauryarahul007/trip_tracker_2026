#!/usr/bin/env bash
# Usage: ./shoot.sh <page-basename> [width] [height]   -> shots/<page>.png (auto-trimmed to content height)
cd "$(dirname "$0")"
P="$1"; W="${2:-1840}"; H="${3:-7000}"
mkdir -p shots
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --virtual-time-budget=3000 --window-size=${W},${H} --screenshot=shots/$P.png "file://$PWD/$P.html" >/dev/null 2>&1
python3 - "$P" <<'PY'
import sys
from PIL import Image, ImageChops
p=f"shots/{sys.argv[1]}.png"
im=Image.open(p).convert("RGB")
bg=Image.new("RGB",im.size,im.getpixel((2,im.size[1]-2)))
bbox=ImageChops.difference(im,bg).getbbox()
if bbox:
    im=im.crop((0,0,im.size[0],min(im.size[1],bbox[3]+60)))
    im.save(p)
print(p, im.size)
PY
