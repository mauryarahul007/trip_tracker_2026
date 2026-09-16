#!/usr/bin/env bash
# Assemble Trip Tracker intro reel (9:16, silent H.264).
# Usage: from repo root or this directory — ./assemble.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SHOTS="$ROOT/shots"
OUT="$ROOT/trip-tracker-intro-9x16.mp4"
WORKDIR="$ROOT/.work"
FPS=30
HOLD=4.5
FADE=0.4
W=1080
H=1920

# Frames (order matches SCRIPT.md)
FRAMES=(
  "01-brand-open.png"
  "02-trip-home.png"
  "03-add-expense.png"
  "04-balances.png"
  "05-map-offline.png"
  "06-end-cta.png"
)

rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"

# Per-clip: scale to 1080x1920, light Ken Burns zoom over HOLD seconds
# zoompan needs enough input frames; loop still as video first.
i=0
clip_list=()
for f in "${FRAMES[@]}"; do
  src="$SHOTS/$f"
  if [[ ! -f "$src" ]]; then
    echo "Missing frame: $src" >&2
    exit 1
  fi
  clip="$WORKDIR/clip_$(printf '%02d' "$i").mp4"
  # Scale/pad, then zoompan from 1.0 → ~1.08 over HOLD*FPS frames
  frames=$(python3 -c "print(int($HOLD * $FPS))")
  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -i "$src" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},zoompan=z='min(1.08,1+0.08*on/${frames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},format=yuv420p" \
    -t "$HOLD" -r "$FPS" -c:v libx264 -pix_fmt yuv420p -an "$clip"
  clip_list+=("$clip")
  i=$((i + 1))
done

# Chain xfade across clips
n=${#clip_list[@]}
if [[ "$n" -lt 2 ]]; then
  cp "${clip_list[0]}" "$OUT"
  echo "Wrote $OUT"
  exit 0
fi

# Build filter_complex for sequential xfades
inputs=()
for c in "${clip_list[@]}"; do
  inputs+=(-i "$c")
done

filter=""
# First segment label
prev="[0:v]"
offset=$(python3 -c "print(round($HOLD - $FADE, 3))")
for ((j=1; j<n; j++)); do
  out="[v$j]"
  if [[ $j -eq $((n - 1)) ]]; then
    out="[vout]"
  fi
  filter+="${prev}[$j:v]xfade=transition=fade:duration=${FADE}:offset=${offset}${out};"
  prev="$out"
  offset=$(python3 -c "print(round($offset + $HOLD - $FADE, 3))")
done
# strip trailing semicolon
filter="${filter%;}"

ffmpeg -y -hide_banner -loglevel error \
  "${inputs[@]}" \
  -filter_complex "$filter" \
  -map "[vout]" \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an \
  "$OUT"

echo "Wrote $OUT"
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,codec_name -of default=noprint_wrappers=1 "$OUT"
