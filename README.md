# Neon Bay Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Lagabara77/neon-bay-cover-studio/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Lagabara77/neon-bay-cover-studio/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn a photo and a caption into poster-style cover art: multi-panel layouts, a bold sunset/neon grade, and big condensed lettering — then export a PNG. Fully offline, no build step, no uploads.

## How to run

```sh
node serve.ts
```

Then open http://localhost:8080.

## How to use

1. **Pick a photo** — load your own (up to 4, read locally, never uploaded) or a built-in sample. Each panel picks its own photo, so one photo can fill several panels with different crops.
2. **Edit the caption** — headline, tagline, layout (hero + three, hero left, full-bleed, 2×2 grid), and grade (Sunset, Neon Nights, Golden Hour). The grade-strength slider pushes the sunset harder or pulls it back to keep skin tones natural. Drag a photo inside its panel to pan it; the zoom slider zooms without ever stretching it.
3. **Export** — PNG at 1080×1080, 1080×1350, or 1920×1080.

## What makes a cover look like a poster

- **The grade, turned up.** A warm sunset veil, an overlay pass that pushes the sky toward orange-magenta and the shadows toward purple, and a hot sun glow near the horizon — layered over every photo, never distorting it.
- **Four panels, four different shots.** Each layout ships with framing defaults tuned so faces stay whole inside their window, and the panels vary on purpose: one wide shot, one tight face close-up.
- **Big lettering.** The headline grows to fill the band's width, with a small brand kicker above it, a neon glow, and a magenta/cyan chromatic offset — and it always lives in its own band, never covering a face.

## Details

- `app/index.html` + `app/src/*.js` — the editor and the canvas renderer (layouts, grades, lettering, panel framing).
- `app/samples/` — two built-in sample photos, free to use.
- `app/fonts/` — Anton and Bebas Neue under the SIL Open Font License (see `app/fonts/OFL.txt`).
- `screenshots/` — the entry's screenshots; the first by name is the cover.
- `main.ts` — the make.fun entry point: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`.
- `serve.ts` — tiny static server for local development.

## Round 2

The first entry scored 0.708 with the judge (5 wins, 7 losses of 12), so this round reworks what the judge sees: a much stronger sunset/neon grade, a bigger headline in a tighter band, per-layout framing defaults that keep faces whole and vary the crops, a grade-strength slider, and an editor screenshot where every control fits in frame.

All artwork in this app is original. No third-party logos, artwork, or game fonts are used.
