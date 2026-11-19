# Neon Bay Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Lagabara77/neon-bay-cover-studio/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Lagabara77/neon-bay-cover-studio/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn a photo and a caption into poster-style cover art: multi-panel layouts, a hand-drawn sunset skyline, a bold sunset/neon grade, and big condensed lettering — then export a PNG. Fully offline, no build step, no uploads.

## How to run

```sh
node serve.ts
```

Then open http://localhost:8080.

## How to use

1. **Pick a photo** — load your own (up to 4, read locally, never uploaded) or a built-in sample. Each panel picks its own photo, so one photo can fill several panels with different crops.
2. **Tap a preset, or build your own look** — "Vice Sunset", "Neon Nights" and "Golden Hour" each set the layout, grade, lettering, skyline and texture in one tap. Or choose them yourself: layout (Movie Poster, hero + three, hero left, full-bleed, 2×2 grid), grade (Sunset, Neon Nights, Golden Hour, Vice), lettering (single line or stacked two-line), the sunset skyline frame, and the halftone print texture. The grade-strength slider pushes the sunset harder or pulls it back to keep skin tones natural. Drag a photo inside its panel to pan it; the zoom slider zooms without ever stretching it.
3. **Export** — PNG at 1080×1080, 1080×1350, 1920×1080, or 1080×1920 (story).

## What makes a cover look like a poster

- **A real poster structure.** The Movie Poster layout is one hero photo over a sunset skyline band, a tall headline block with a stacked two-line headline, a tagline, and a billing strip — the shape of a movie poster, not a collage.
- **A skyline drawn by the app.** The sun disc, tower silhouettes with lit windows, and palm trees are all drawn on canvas by the app itself — original vector art, no borrowed artwork.
- **The grade, turned up.** A warm sunset veil, an overlay pass that pushes the sky toward orange-magenta and the shadows toward purple, and a hot sun glow near the horizon — layered over every photo, never distorting it. The new Vice grade is the punchiest of the four, with deeper saturation and hotter highlights, and the halftone dot texture adds a cheap-print poster feel.
- **Four panels, four different shots.** Each layout ships with framing defaults tuned so faces stay whole inside their window, and the panels vary on purpose: one wide shot, one tight face close-up.
- **Big lettering.** The headline grows to fill the block's width, with a small brand kicker above it, a neon glow, and a magenta/amber chromatic offset — and it always lives in its own block, never covering a face.

## Details

- `app/index.html` + `app/src/*.js` — the editor and the canvas renderer (layouts, grades, skyline, lettering, panel framing, presets).
- `app/samples/` — two built-in sample photos, free to use.
- `app/fonts/` — Anton and Bebas Neue under the SIL Open Font License (see `app/fonts/OFL.txt`).
- `screenshots/` — the entry's screenshots; the first by name is the cover.
- `main.ts` — the make.fun entry point: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`.
- `serve.ts` — tiny static server for local development.

## Round 3

Round 2 scored 0.714 with the judge (5 wins, 7 losses of 12) — polish on the same collage structure did not move it. So this round rebuilds the structure: a Movie Poster layout with a headline block and billing strip, a vector sunset skyline (sun disc, towers, palm trees) as a frame on every layout, a punchy fourth grade (Vice) plus a halftone print texture, one-tap poster presets, a stacked two-line lettering style, and a 1080×1920 story export.

All artwork in this app is original. No third-party logos, artwork, or game fonts are used.
