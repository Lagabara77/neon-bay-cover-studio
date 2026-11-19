// Neon Bay Cover Studio — cover renderer.
//
// One canvas renderer for the whole poster: fixed panel windows, a headline band
// that never overlaps a face, a sunset/neon grade laid over the photos, and bold
// condensed lettering with a chromatic offset shadow. Every photo is drawn with a
// single uniform scale (scaleX == scaleY) and a focus point, so nothing is ever
// stretched or squashed.
//
// State shape (built by main.js):
//   {
//     layout: 'grid4' | 'hero3' | 'full' | 'quad',
//     grade: 'sunset' | 'neon' | 'golden',
//     headline: string, tagline: string, footer: string,
//     photos: (HTMLImageElement | null)[],   // library slots, up to 4
//     panels: [{ photo: number, zoom: number, fx: number, fy: number }], // 4 slots
//   }

export const LAYOUTS = ['grid4', 'hero3', 'full', 'quad'];
export const GRADES = ['sunset', 'neon', 'golden'];
export const PANEL_COUNT = 4;

// Height of the headline band, as a fraction of the cover height.
const BAND = 0.17;

// ---------------------------------------------------------------------------
// Layouts: panel rectangles as fractions of the photo area (the area above
// the headline band). Each entry is [x, y, w, h] in 0..1 of that area.
// ---------------------------------------------------------------------------
function panelRects(layout) {
  switch (layout) {
    case 'hero3': // big panel on the left, three stacked on the right
      return [
        [0, 0, 0.62, 1],
        [0.62, 0, 0.38, 1 / 3],
        [0.62, 1 / 3, 0.38, 1 / 3],
        [0.62, 2 / 3, 0.38, 1 / 3],
      ];
    case 'full': // one full-bleed panel
      return [[0, 0, 1, 1]];
    case 'quad': // 2 x 2 grid
      return [
        [0, 0, 0.5, 0.5],
        [0.5, 0, 0.5, 0.5],
        [0, 0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5, 0.5],
      ];
    case 'grid4':
    default: // hero across the top, three columns below
      return [
        [0, 0, 1, 0.56],
        [0, 0.56, 1 / 3, 0.44],
        [1 / 3, 0.56, 1 / 3, 0.44],
        [2 / 3, 0.56, 1 / 3, 0.44],
      ];
  }
}

/** Panel rectangles in canvas pixels for a given layout and cover size. */
export function layoutPanels(layout, width, height) {
  const photoH = height * (1 - BAND);
  const gap = Math.max(3, Math.round(Math.min(width, height) * 0.008));
  return panelRects(layout).map(([fx, fy, fw, fh]) => {
    const x = Math.round(fx * width + (fx > 0 ? gap / 2 : 0));
    const y = Math.round(fy * photoH + (fy > 0 ? gap / 2 : 0));
    const w = Math.round(fw * width - (fx > 0 ? gap / 2 : 0) - (fx + fw < 1 ? gap / 2 : 0));
    const h = Math.round(fh * photoH - (fy > 0 ? gap / 2 : 0) - (fy + fh < 1 ? gap / 2 : 0));
    return { x, y, w, h };
  });
}

// ---------------------------------------------------------------------------
// Grades: a tint gradient washed over the photos, a neon accent pair, and a
// vignette strength. The grade never moves or distorts the photo underneath.
// ---------------------------------------------------------------------------
const GRADE_DEFS = {
  sunset: {
    // warm orange melting into magenta, then deep purple at the foot
    stops: [
      [0, 'rgba(255, 150, 60, 0.10)'],
      [0.45, 'rgba(255, 90, 90, 0.12)'],
      [0.8, 'rgba(215, 40, 130, 0.22)'],
      [1, 'rgba(70, 20, 110, 0.34)'],
    ],
    accentA: '#ff2e88', // magenta
    accentB: '#22d3ee', // cyan
    vignette: 0.42,
  },
  neon: {
    stops: [
      [0, 'rgba(34, 211, 238, 0.14)'],
      [0.5, 'rgba(120, 60, 255, 0.16)'],
      [1, 'rgba(255, 46, 136, 0.30)'],
    ],
    accentA: '#22d3ee',
    accentB: '#ff2e88',
    vignette: 0.5,
  },
  golden: {
    stops: [
      [0, 'rgba(255, 210, 90, 0.14)'],
      [0.55, 'rgba(255, 140, 50, 0.14)'],
      [1, 'rgba(140, 50, 20, 0.30)'],
    ],
    accentA: '#ffb020',
    accentB: '#ff5e3a',
    vignette: 0.34,
  },
};

// ---------------------------------------------------------------------------
// Grain: one small tile drawn once from a fixed seed, then tiled over the
// cover at low alpha. Same seed every run, so renders are reproducible.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(140, 140);
  const rand = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() > 0.5 ? 255 : 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28; // faint: alpha is baked into the tile
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

// ---------------------------------------------------------------------------
// Photo drawing: uniform scale only. The focus point (fx, fy) in 0..1 of the
// source image is placed at the panel centre, then clamped so the panel is
// always fully covered — a face can never slide out of its window.
// ---------------------------------------------------------------------------
function drawPhotoInPanel(ctx, img, panel, zoom, fx, fy) {
  const { x, y, w, h } = panel;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(w / iw, h / ih); // cover-fit, uniform
  const scale = base * Math.max(1, zoom);
  const dw = iw * scale;
  const dh = ih * scale;
  // Put the focus point at the panel centre, then clamp to full coverage.
  let dx = x + w / 2 - fx * dw;
  let dy = y + h / 2 - fy * dh;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  // Thin inner frame so panels read as separate poster windows.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.006));
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawEmptyPanel(ctx, panel, label) {
  const { x, y, w, h } = panel;
  ctx.save();
  ctx.fillStyle = '#241534';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `600 ${Math.max(14, Math.round(h * 0.09))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Lettering: condensed headline, white fill, black outline, magenta/cyan
// offset shadows. The size shrinks until the line fits the band.
// ---------------------------------------------------------------------------
function fitHeadlineFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  const family = '"Anton", "Bebas Neue", "Arial Narrow", sans-serif';
  ctx.font = `${size}px ${family}`;
  while (size > 16 && ctx.measureText(text).width > maxWidth) {
    size = Math.round(size * 0.94);
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawHeadline(ctx, text, bandY, bandH, width, accentA, accentB) {
  const clean = text.trim().toUpperCase();
  if (!clean) return;
  const size = fitHeadlineFont(ctx, clean, width * 0.94, Math.round(bandH * 0.62));
  const cx = width / 2;
  const cy = bandY + bandH * 0.56;
  const off = Math.max(2, Math.round(size * 0.035));
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // Chromatic offset: cyan one way, magenta the other, white on top.
  ctx.fillStyle = accentB;
  ctx.fillText(clean, cx - off, cy - off * 0.4);
  ctx.fillStyle = accentA;
  ctx.fillText(clean, cx + off, cy + off * 0.4);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(clean, cx, cy);
  ctx.strokeStyle = 'rgba(10, 5, 20, 0.9)';
  ctx.lineWidth = Math.max(2, Math.round(size * 0.045));
  ctx.strokeText(clean, cx, cy);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(clean, cx, cy);
  ctx.restore();
}

function drawTagline(ctx, text, bandY, bandH, width) {
  const clean = text.trim();
  if (!clean) return;
  const size = Math.max(13, Math.round(bandH * 0.16));
  ctx.save();
  ctx.font = `${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.28)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(clean.toUpperCase(), width / 2, bandY + bandH * 0.88);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main entry: render the whole cover onto `canvas` at its own pixel size.
// ---------------------------------------------------------------------------
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADE_DEFS[state.grade] ?? GRADE_DEFS.sunset;
  const bandH = Math.round(h * BAND);
  const bandY = h - bandH;
  const photoH = h - bandH;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  // Panels.
  const panels = layoutPanels(state.layout, w, h);
  const count = state.layout === 'full' ? 1 : PANEL_COUNT;
  for (let i = 0; i < count; i += 1) {
    const slot = state.panels[i] ?? { photo: 0, zoom: 1, fx: 0.5, fy: 0.5 };
    const img = state.photos[slot.photo] ?? null;
    if (img) {
      drawPhotoInPanel(ctx, img, panels[i], slot.zoom, slot.fx, slot.fy);
    } else {
      drawEmptyPanel(ctx, panels[i], `PANEL ${i + 1} — ADD A PHOTO`);
    }
  }

  // Grade wash over the photo area only.
  ctx.save();
  const wash = ctx.createLinearGradient(0, 0, 0, photoH);
  for (const [stop, color] of grade.stops) wash.addColorStop(stop, color);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, photoH);
  ctx.restore();

  // Neon accent line where the photo area meets the headline band.
  ctx.save();
  const seam = ctx.createLinearGradient(0, 0, w, 0);
  seam.addColorStop(0, grade.accentB);
  seam.addColorStop(0.5, grade.accentA);
  seam.addColorStop(1, grade.accentB);
  ctx.fillStyle = seam;
  ctx.fillRect(0, photoH - 2, w, 4);
  ctx.restore();

  // Headline band: deep dusk gradient so the lettering always reads.
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, h);
  bandGrad.addColorStop(0, '#1d0b33');
  bandGrad.addColorStop(1, '#0a0416');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, w, bandH);

  drawHeadline(ctx, state.headline, bandY, bandH, w, grade.accentA, grade.accentB);
  drawTagline(ctx, state.tagline, bandY, bandH, w);

  // Footer strip: studio mark on the left, export size on the right.
  ctx.save();
  const footSize = Math.max(11, Math.round(h * 0.011));
  ctx.font = `600 ${footSize}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText((state.footer || 'NEON BAY').toUpperCase(), 14, h - 8);
  ctx.textAlign = 'right';
  ctx.fillText(`${w} × ${h}`, w - 14, h - 8);
  ctx.restore();

  // Vignette + grain over everything, kept subtle.
  ctx.save();
  const vig = ctx.createRadialGradient(
    w / 2, h * 0.42, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(10, 4, 20, 0)');
  vig.addColorStop(1, `rgba(10, 4, 20, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Render the cover at an export size and resolve with the PNG blob. */
export function exportCoverPng(state, width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  renderCover(off, state);
  return new Promise((resolve, reject) => {
    off.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned nothing'));
    }, 'image/png');
  });
}
