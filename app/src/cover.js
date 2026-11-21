// Neon Bay Cover Studio — cover renderer (round 5).
//
// Round 5 is the top-rank teardown round. Rounds 1-3 scored 0.69-0.71
// against a 0.925 top-50 cutoff, and the teardown of the top 5 showed the
// gap is presentation, not polish: their shot 1 is always a finished
// poster full-bleed (never an editor), three DIFFERENT posters across the
// shots, 6-8 glamorous faces with a role tag on every panel, a giant
// striped-chrome 3D headline, and full poster furniture (quote strip,
// VOL. badge, gold seal, billing strip, barcode, COMING SOON) on every
// poster. So this round adds exactly that: a 6-panel Cast layout with six
// sample portraits and per-panel role tags, a Chrome lettering style
// (vertical chrome gradient + extruded shadow stack + glow) as the
// default, poster furniture on ALL layouts, a taller headline block
// (the poster band is now ~36% of the cover height), a fifth grade
// (Dusk), and richer grades (more saturation/contrast/glow) so faces stop
// washing out. The old four layouts, four grades, presets and skyline
// stay as they were.
//
// Every photo is drawn with one uniform scale (scaleX == scaleY) and a
// focus point, so nothing is ever stretched or squashed.
//
// State shape (built by main.js):
//   {
//     layout: 'grid4' | 'hero3' | 'full' | 'quad' | 'poster' | 'cast',
//     grade: 'sunset' | 'neon' | 'golden' | 'vice' | 'dusk',
//     gradeStrength: number,          // 0.5 .. 1.5, multiplies grade alphas
//     headline: string, tagline: string, footer: string, kicker: string,
//     billing: string,                // billing strip, e.g. "A NEON BAY PRODUCTION"
//     credits: string,                // credits line under the billing strip (round 6)
//     popout: boolean,                // hero3: hero card breaks the grid (round 6)
//     letteringStyle: 'single' | 'stacked' | 'chrome',
//     skylineFrame: boolean,          // sunset skyline strip under the photos
//     halftone: boolean,              // print-dot texture over the photos
//     quote: string, quoteSource: string, // quote strip at the top
//     volume: string,                 // "VOL. 1" badge
//     castTags: string[],             // role tag per panel, e.g. "THE DRIVER"
//     photos: (HTMLImageElement | null)[],   // library slots, up to 6
//     panels: [{ photo: number, zoom: number, fx: number, fy: number }], // up to 6
//   }

export const LAYOUTS = ['grid4', 'hero3', 'full', 'quad', 'poster', 'cast'];
export const GRADES = ['sunset', 'neon', 'golden', 'vice', 'dusk'];
export const PANEL_COUNT = 4;
export const CAST_PANEL_COUNT = 6;
export const LETTERING_STYLES = ['single', 'stacked', 'chrome'];

// The six sample portraits, in slot order, and the role tag each one
// carries by default. The tags are editable in the editor (one
// comma-separated field); the cast order is the panel order.
export const CAST_SAMPLES = ['driver', 'boss', 'mechanic', 'queen', 'pier', 'boulevard'];
export const DEFAULT_CAST_TAGS = [
  'THE DRIVER', 'THE BOSS', 'THE MECHANIC', 'THE QUEEN', 'THE RIDER', 'THE LOOKOUT',
];

// Focus point (fy) per sample, measured from the actual portraits so the
// face — eyes to chin — lands inside its panel window. Tall 1:2
// portraits in a wide panel only show a ~640px slice of the source, so
// fy is tuned to the face centre, not the hairline: hair may crop a
// little (normal poster cropping), the face itself never does.
export const SAMPLE_FOCUS = {
  driver: { fx: 0.5, fy: 0.16 },
  boss: { fx: 0.5, fy: 0.42 },
  mechanic: { fx: 0.5, fy: 0.33 },
  queen: { fx: 0.5, fy: 0.28 },
  pier: { fx: 0.5, fy: 0.3 },
  boulevard: { fx: 0.5, fy: 0.3 },
};

// Round 6: face-centre focus for the WIDE Cast panels only. A Cast panel
// is ~1.8:1, so it shows only a ~0.29-tall slice of a tall portrait —
// SAMPLE_FOCUS (tuned for the tall hero/poster windows, where hair AND
// chin fit) cuts faces there: measured on the actual portraits
// (eyes/chin in fy: driver 0.237/0.355, boss 0.516/0.730, mechanic
// 0.305/0.495, queen 0.345/0.500, pier 0.178/0.365, boulevard
// 0.210/0.298), the round-5 cast framing cut the driver's mouth and
// chin entirely and nicked the boss's and mechanic's chins. These fy
// values sit on the face centre (eyes->chin midpoint, nudged up a touch
// so the chin keeps headroom from the panel bottom and the role-tag
// chip): the hair crops at the panel edge — normal poster cropping —
// and eyes->chin stays whole in every cast panel.
export const CAST_FOCUS = {
  driver: { fx: 0.5, fy: 0.28 },
  boss: { fx: 0.5, fy: 0.58 },
  mechanic: { fx: 0.5, fy: 0.37 },
  queen: { fx: 0.5, fy: 0.4 },
  pier: { fx: 0.5, fy: 0.3 },
  boulevard: { fx: 0.5, fy: 0.27 },
};

// Height of the headline block, as a fraction of the cover height. Round 5
// raises both: the panel band 0.15 -> 0.19 so the billing strip, barcode
// and COMING SOON fit without crowding, and the Movie Poster band 0.21 ->
// 0.36 so the headline block itself (kicker + two-line chrome headline +
// tagline + billing + footer) occupies ~36% of the poster height.
// Round 6 raises the panel band 0.19 -> 0.22: the round-5 band left a
// wide dark gap between the billing strip and the barcode/COMING SOON
// row (worst on the 16:9 poster), and the extra ~3% buys a credits line
// under the billing strip without crowding the tagline. The poster band
// stays 0.36 — it already reads full.
const BAND = 0.22;
const POSTER_BAND = 0.36;

// Height of the sunset skyline strip, as a fraction of the cover height.
const SKYLINE_H = 0.13;

// ---------------------------------------------------------------------------
// Layouts: panel rectangles as fractions of the photo area (the area above
// the headline band and, when shown, above the skyline strip).
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
    case 'poster': // movie poster: one hero photo, full-bleed
      return [[0, 0, 1, 1]];
    case 'cast': // round 5: six-face cast grid, 3 columns x 2 rows
      return [
        [0, 0, 1 / 3, 0.5],
        [1 / 3, 0, 1 / 3, 0.5],
        [2 / 3, 0, 1 / 3, 0.5],
        [0, 0.5, 1 / 3, 0.5],
        [1 / 3, 0.5, 1 / 3, 0.5],
        [2 / 3, 0.5, 1 / 3, 0.5],
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

/** How tall the headline block is for a layout, in canvas pixels. */
export function headlineBandHeight(layout, height) {
  return Math.round(height * (layout === 'poster' ? POSTER_BAND : BAND));
}

/** How tall the skyline strip is for this state, in canvas pixels. */
export function skylineStripHeight(state, height) {
  const show = state.layout === 'poster' || state.skylineFrame;
  return show ? Math.round(height * SKYLINE_H) : 0;
}

/** Panel rectangles in canvas pixels for a layout, cover size and state. */
export function layoutPanels(layout, width, height, state) {
  const bandH = headlineBandHeight(layout, height);
  const skyH = state ? skylineStripHeight(state, height) : 0;
  const photoH = height - bandH - skyH;
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
// Default framing per layout, tuned against the two sample photos so faces
// stay whole and the panels read as different shots, not repeats.
// pier.jpg is square (720x720): the man's face sits around fy 0.20-0.36.
// boulevard.jpg is portrait (544x720): the woman's face sits around
// fy 0.19-0.48. Each layout's defaults centre the face in its window with
// headroom, then vary the zoom: one wide shot, one tight face close-up.
// ---------------------------------------------------------------------------
export function panelDefaults(layout) {
  switch (layout) {
    case 'hero3':
      return [
        { photo: 0, zoom: 1, fx: 0.52, fy: 0.5 }, // tall hero: full height shows
        { photo: 1, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 0, zoom: 1.3, fx: 0.5, fy: 0.32 }, // tighter primary
        { photo: 1, zoom: 1.15, fx: 0.5, fy: 0.3 },
      ];
    case 'full':
    case 'poster':
      // One hero photo. Round 3: fy 0.30 keeps the hat in frame on the
      // wide landscape poster, where a square photo is cropped hard
      // vertically; the other slots keep sensible defaults so switching
      // layouts never strands a panel.
      return [
        { photo: 0, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 1, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 0, zoom: 1.3, fx: 0.5, fy: 0.32 },
        { photo: 1, zoom: 1.15, fx: 0.5, fy: 0.3 },
      ];
    case 'quad':
      return [
        { photo: 0, zoom: 1, fx: 0.5, fy: 0.28 }, // wide primary
        { photo: 1, zoom: 1, fx: 0.5, fy: 0.3 }, // wide secondary
        { photo: 0, zoom: 1.45, fx: 0.5, fy: 0.33 }, // tight face close-up
        { photo: 1, zoom: 1.2, fx: 0.5, fy: 0.3 },
      ];
    case 'cast':
      // Six faces, one per panel, zoom 1 so the widest possible slice of
      // each tall portrait shows — the face framing comes from
      // SAMPLE_FOCUS, applied by castPanelDefaults below.
      return [
        { photo: 0, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 1, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 2, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 3, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 4, zoom: 1, fx: 0.5, fy: 0.3 },
        { photo: 5, zoom: 1, fx: 0.5, fy: 0.3 },
      ];
    case 'grid4':
    default:
      return [
        { photo: 0, zoom: 1, fx: 0.5, fy: 0.28 }, // hero strip: face centred
        { photo: 1, zoom: 1, fx: 0.5, fy: 0.3 }, // wide boulevard
        { photo: 0, zoom: 1, fx: 0.5, fy: 0.38 }, // wider pier, shoulders + pier
        { photo: 1, zoom: 1.35, fx: 0.52, fy: 0.34 }, // tight face close-up
      ];
  }
}

// ---------------------------------------------------------------------------
// Cast-aware framing (round 5): given a layout and the ordered cast of
// sample names, point each panel at a DIFFERENT sample and aim its focus
// at that sample's measured face centre. This is what the screenshot
// scenes use, so every poster shows a different set of faces, each one
// framed on its face instead of on the old photo-0/photo-1 alternation.
// ---------------------------------------------------------------------------
export function castPanelDefaults(layout, cast) {
  const base = panelDefaults(layout);
  const names = Array.isArray(cast) && cast.length > 0 ? cast : CAST_SAMPLES;
  // Round 6: the Cast grid's wide panels frame on the face centre
  // (CAST_FOCUS); every other layout keeps the tall-window framing
  // (SAMPLE_FOCUS), which round 5 verified visually there.
  const focusTable = layout === 'cast' ? CAST_FOCUS : SAMPLE_FOCUS;
  return base.map((slot, i) => {
    const name = names[i % names.length];
    const focus = focusTable[name] ?? { fx: 0.5, fy: 0.3 };
    return { photo: i % names.length, zoom: slot.zoom, fx: focus.fx, fy: focus.fy };
  });
}

// ---------------------------------------------------------------------------
// One-tap poster presets (round 3). A preset sets layout + grade +
// lettering style + skyline frame + halftone + grade strength in one tap,
// so a first-time user goes from a photo to a finished poster look with
// no hunting through controls. It never touches the headline or the
// photos — those stay the user's.
// ---------------------------------------------------------------------------
export const POSTER_PRESETS = {
  'vice-sunset': {
    layout: 'poster', grade: 'vice', letteringStyle: 'stacked',
    skylineFrame: true, halftone: true, gradeStrength: 1.2,
  },
  'neon-nights': {
    layout: 'grid4', grade: 'neon', letteringStyle: 'single',
    skylineFrame: true, halftone: false, gradeStrength: 1.15,
  },
  'golden-hour': {
    layout: 'hero3', grade: 'golden', letteringStyle: 'single',
    skylineFrame: false, halftone: false, gradeStrength: 1.1,
  },
  'cast-crew': {
    layout: 'cast', grade: 'sunset', letteringStyle: 'chrome',
    skylineFrame: true, halftone: false, gradeStrength: 1.15,
  },
};

/** Apply a named poster preset to the editor state, in place. */
export function applyPosterPreset(state, name) {
  const preset = POSTER_PRESETS[name];
  if (!preset) return false;
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.letteringStyle = preset.letteringStyle;
  state.skylineFrame = preset.skylineFrame;
  state.halftone = preset.halftone;
  state.gradeStrength = preset.gradeStrength;
  state.panels = panelDefaults(preset.layout);
  return true;
}

// ---------------------------------------------------------------------------
// Grades. Each grade is three layers over the photos, all scaled by the
// grade-strength slider (0.5..1.5, default 1):
//   stops   — a warm veil in normal compositing (the sunset itself);
//   overlay — an overlay-blend pass that pushes sky toward orange-magenta
//             and shadows toward purple while keeping faces readable;
//   glow    — a screen-blend sun bloom, the hot horizon that sells sunset.
//   sat     — the saturate() lift on the photos under the grade.
// Round 3 adds Vice: the punchiest grade of the four, deeper saturation
// and hotter highlights than Sunset, built for the poster look.
// ---------------------------------------------------------------------------
const GRADE_DEFS = {
  sunset: {
    // Round 6: the top veil/overlay stops are thinned (0.20->0.15,
    // 0.22->0.19, 0.26->0.21) and the glow moves in from the corner
    // (glowX 0.08->0.15) — round 5 left the top-left panel hazy orange
    // and the glow pooled in the corner instead of reading as horizon.
    stops: [
      [0, 255, 150, 60, 0.15],
      [0.45, 255, 90, 90, 0.19],
      [0.8, 215, 40, 130, 0.24],
      [1, 70, 20, 110, 0.28],
    ],
    overlay: [
      [0, 255, 130, 60, 0.21],
      [1, 110, 30, 150, 0.26],
    ],
    glow: [255, 190, 100],
    glowX: 0.15,
    glowY: 0.45,
    accentA: '#ff2e88', // magenta
    accentB: '#22d3ee', // cyan
    vignette: 0.55,
    sat: 1.22,
  },
  neon: {
    // Round 6: the magenta end is thinned (veil bottom 0.26->0.18, mid
    // 0.20->0.16; overlay bottom 0.27->0.20) and saturation eased
    // 1.28->1.22 — round 5 left the queen's skin pink-magenta in the
    // portrait poster. The neon still reads (cyan top, magenta base),
    // the skin just stops tinting.
    stops: [
      [0, 34, 211, 238, 0.16],
      [0.5, 120, 60, 255, 0.16],
      [1, 255, 46, 136, 0.18],
    ],
    overlay: [
      [0, 40, 200, 230, 0.19],
      [1, 255, 50, 140, 0.2],
    ],
    glow: [255, 80, 180],
    glowX: 0.84,
    glowY: 0.25,
    accentA: '#22d3ee',
    accentB: '#ff2e88',
    vignette: 0.6,
    sat: 1.22,
  },
  golden: {
    stops: [
      [0, 255, 210, 90, 0.2],
      [0.55, 255, 140, 50, 0.22],
      [1, 140, 50, 20, 0.28],
    ],
    overlay: [
      [0, 255, 200, 90, 0.26],
      [1, 160, 60, 20, 0.26],
    ],
    glow: [255, 200, 110],
    glowX: 0.5,
    glowY: 0.22,
    accentA: '#ffb020',
    accentB: '#ff5e3a',
    vignette: 0.48,
    sat: 1.22,
  },
  vice: {
    stops: [
      [0, 255, 125, 40, 0.26],
      [0.4, 255, 60, 110, 0.28],
      [0.75, 200, 30, 165, 0.32],
      [1, 60, 10, 125, 0.36],
    ],
    overlay: [
      [0, 255, 110, 40, 0.34],
      [1, 120, 20, 175, 0.34],
    ],
    glow: [255, 170, 60],
    glowX: 0.5,
    glowY: 0.35,
    accentA: '#ff2e88',
    accentB: '#ff9f1c', // hot amber, against the magenta
    vignette: 0.58,
    sat: 1.42,
  },
  dusk: {
    // Round 5, fifth grade: teal dusk sky falling into magenta neon —
    // the cool counterpart to the warm Sunset, for night-drive posters.
    stops: [
      [0, 20, 180, 200, 0.2],
      [0.5, 120, 60, 200, 0.22],
      [1, 255, 46, 136, 0.28],
    ],
    overlay: [
      [0, 30, 170, 210, 0.26],
      [1, 200, 30, 160, 0.31],
    ],
    glow: [80, 200, 255],
    glowX: 0.2,
    glowY: 0.3,
    accentA: '#22d3ee',
    accentB: '#ff2e88',
    vignette: 0.55,
    sat: 1.25,
  },
};

/** One grade stop as an rgba() string, scaled by the strength slider. */
function stopColor(r, g, b, a, strength) {
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, a * strength)})`;
}

function applyGrade(ctx, w, photoH, grade, strength) {
  // 1. Warm veil, normal compositing.
  const wash = ctx.createLinearGradient(0, 0, 0, photoH);
  for (const [stop, r, g, b, a] of grade.stops) {
    wash.addColorStop(stop, stopColor(r, g, b, a, strength));
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, photoH);

  // 2. Overlay pass: sky goes orange-magenta, shadows go purple.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const ov = ctx.createLinearGradient(0, 0, 0, photoH);
  for (const [stop, r, g, b, a] of grade.overlay) {
    ov.addColorStop(stop, stopColor(r, g, b, a, strength));
  }
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, w, photoH);
  ctx.restore();

  // 3. Sun glow, screen compositing: a hot bloom near the horizon.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const gx = w * grade.glowX;
  const gy = photoH * grade.glowY;
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, photoH) * 0.55);
  const [gr, gg, gb] = grade.glow;
  glow.addColorStop(0, stopColor(gr, gg, gb, 0.3, strength));
  glow.addColorStop(1, stopColor(gr, gg, gb, 0, strength));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, photoH);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Sunset skyline, drawn entirely on canvas (round 3): a gradient dusk sky,
// a slatted sun disc, a row of dark tower silhouettes with lit windows,
// and palm trees. This is the poster's signature strip — the thing that
// makes the cover read as a designed poster instead of a photo collage.
// All shapes are deterministic (fixed seed), so renders are reproducible.
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

/** A retro sun disc: hot gradient circle with dark horizontal slats. */
export function drawSunDisc(ctx, cx, cy, r) {
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, '#ffe259');
  disc.addColorStop(0.45, '#ff7e3d');
  disc.addColorStop(1, '#ff2e88');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();
  // Slats: dark bars that grow thicker toward the bottom of the disc.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(30, 8, 50, 0.9)';
  let y = cy + r * 0.05;
  let bar = Math.max(2, r * 0.045);
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, bar);
    y += bar + Math.max(3, r * 0.11);
    bar *= 1.55;
  }
  ctx.restore();
}

/** One palm tree silhouette: a leaning trunk and seven drooping fronds. */
export function drawPalmTree(ctx, x, baseY, height, color) {
  const lean = height * 0.16;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a gentle curve leaning away from the sun.
  ctx.lineWidth = Math.max(2, height * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * 0.4, baseY - height * 0.6, x + lean, baseY - height);
  ctx.stroke();
  // Fronds fan out from the crown.
  const crownX = x + lean;
  const crownY = baseY - height;
  ctx.lineWidth = Math.max(1.5, height * 0.03);
  for (let i = 0; i < 7; i += 1) {
    const angle = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = height * (i % 2 === 0 ? 0.52 : 0.42);
    const tipX = crownX + Math.cos(angle) * len;
    const tipY = crownY - Math.sin(angle) * len * 0.55 + len * 0.3;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + Math.cos(angle) * len * 0.55,
      crownY - Math.sin(angle) * len * 0.7,
      tipX, tipY,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** The full skyline strip: dusk gradient, sun disc, tower silhouettes. */
export function drawSunsetSkyline(ctx, x, y, w, h) {
  ctx.save();
  // Dusk sky: amber at the horizon fading up into magenta and deep purple.
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#2a0a4d');
  sky.addColorStop(0.45, '#c2185b');
  sky.addColorStop(0.75, '#ff7e3d');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  const horizon = y + h * 0.86;
  // The sun sits in a gap in the towers: no tower is drawn across the
  // disc, so the sun always reads instead of hiding behind a building.
  const sunCx = x + w * 0.68;
  const sunR = h * 0.34;
  drawSunDisc(ctx, sunCx, horizon - h * 0.16, sunR);

  // Tower silhouettes: deterministic heights, dark purple, with a few
  // lit windows so the skyline feels inhabited, not flat.
  const rand = mulberry32(20261119);
  const sill = '#1c0733';
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.05 + rand() * 0.075);
    // Leave the sun's gap clear.
    if (bx + bw > sunCx - sunR * 1.15 && bx < sunCx + sunR * 1.15) {
      bx += bw + w * 0.008;
      continue;
    }
    const bh = h * (0.28 + rand() * 0.5);
    const top = horizon - bh;
    ctx.fillStyle = sill;
    ctx.fillRect(bx, top, bw, bh);
    // A rooftop antenna on every third tower.
    if (rand() > 0.66) {
      ctx.fillRect(bx + bw / 2 - 1, top - h * 0.16, 2, h * 0.16);
    }
    // Lit windows: tiny amber dots in a loose grid.
    ctx.fillStyle = 'rgba(255, 196, 107, 0.85)';
    const cols = Math.max(1, Math.floor(bw / (w * 0.022)));
    const rows = Math.max(1, Math.floor(bh / (h * 0.16)));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        if (rand() > 0.62) {
          ctx.fillRect(
            bx + bw * 0.18 + (c * bw) / cols,
            top + bh * 0.12 + (r * bh) / rows,
            Math.max(2, w * 0.004), Math.max(2, h * 0.05),
          );
        }
      }
    }
    bx += bw + w * 0.008;
  }

  // Palm trees frame the strip at both ends, in front of the towers.
  drawPalmTree(ctx, x + w * 0.045, horizon + h * 0.02, h * 0.72, sill);
  drawPalmTree(ctx, x + w * 0.955, horizon + h * 0.02, h * 0.62, sill);

  // Ground line under the skyline.
  ctx.fillStyle = sill;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.restore();
}

/** The skyline strip as a frame between the photos and the headline. */
export function drawSkylineFrame(ctx, x, y, w, h) {
  drawSunsetSkyline(ctx, x, y, w, h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Halftone dot texture (round 3): a print-style dot grid over the photo
// area, dots growing toward the bottom of each tile — the cheap-print look
// of a real poster. Drawn at low alpha so faces stay readable.
// ---------------------------------------------------------------------------
export function drawHalftoneTexture(ctx, w, photoH) {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 5, 35, 0.16)';
  const step = Math.max(9, Math.round(Math.min(w, photoH) * 0.016));
  for (let y = step / 2; y < photoH; y += step) {
    const row = Math.floor(y / step);
    for (let x = step / 2; x < w; x += step) {
      const r = step * 0.1 * (1 + (row % 4) * 0.28);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Grain: one small tile drawn once from a fixed seed, then tiled over the
// cover at low alpha. Same seed every run, so renders are reproducible.
// ---------------------------------------------------------------------------
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
// A saturate/contrast lift makes the photos pop under the grade.
// ---------------------------------------------------------------------------
function drawPhotoInPanel(ctx, img, panel, zoom, fx, fy, sat) {
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
  ctx.filter = `saturate(${sat}) contrast(1.08)`;
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

/** Pop-out hero (round 6): the hero photo re-drawn in a rect that
 * overhangs its panel to the right, on a drop shadow, so the card reads
 * as lifted in front of its neighbours. The photo itself is re-fit to
 * the wider rect (same uniform-scale rule), and its own white frame
 * stroke sells the card edge. */
function drawPopoutHero(ctx, img, panel, slot, sat) {
  const overhang = Math.max(14, Math.round(Math.min(panel.w, panel.h) * 0.08));
  const big = { x: panel.x, y: panel.y, w: panel.w + overhang, h: panel.h };
  ctx.save();
  ctx.shadowColor = 'rgba(5, 2, 12, 0.65)';
  ctx.shadowBlur = Math.max(10, Math.round(overhang * 0.8));
  ctx.shadowOffsetX = Math.round(overhang * 0.35);
  ctx.shadowOffsetY = Math.round(overhang * 0.4);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(big.x, big.y, big.w, big.h);
  ctx.restore();
  drawPhotoInPanel(ctx, img, big, slot.zoom, slot.fx, slot.fy, sat);
}

// ---------------------------------------------------------------------------
// Lettering: condensed headline, white fill, black outline, magenta/cyan
// offset shadows, a soft neon glow. Round 3 adds the Stacked style: the
// headline splits into two centred lines, the movie-poster treatment.
// The size still GROWS to fill the available width (capped by the block
// height), so a short headline on a wide cover reads big, not small.
// ---------------------------------------------------------------------------
function fitHeadlineFont(ctx, text, maxWidth, startSize, maxSize) {
  const family = '"Anton", "Bebas Neue", "Arial Narrow", sans-serif';
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  // Grow toward the available width first — a wide cover wants a big headline.
  while (size < maxSize && ctx.measureText(text).width < maxWidth * 0.98) {
    size = Math.min(maxSize, Math.round(size * 1.05) + 1);
    ctx.font = `${size}px ${family}`;
  }
  // Then shrink until the line fits, if it still does not.
  while (size > 16 && ctx.measureText(text).width > maxWidth) {
    size = Math.round(size * 0.94);
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Split a headline into two balanced lines at a word boundary. */
export function splitStackedHeadline(text) {
  const words = text.trim().toUpperCase().split(/\s+/);
  if (words.length < 2) return [text.trim().toUpperCase()];
  let best = 1;
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const top = words.slice(0, i).join(' ').length;
    const bottom = words.slice(i).join(' ').length;
    const score = Math.abs(top - bottom);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function drawHeadlineLine(ctx, text, cx, cy, size, accentA, accentB) {
  const off = Math.max(2, Math.round(size * 0.035));
  ctx.save();
  ctx.font = `${size}px "Anton", "Bebas Neue", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // Chromatic offset: amber one way, magenta the other, white on top.
  ctx.fillStyle = accentB;
  ctx.fillText(text, cx - off, cy - off * 0.4);
  ctx.fillStyle = accentA;
  ctx.fillText(text, cx + off, cy + off * 0.4);
  // Neon glow on the white fill, then a black outline for legibility.
  ctx.shadowColor = accentA;
  ctx.shadowBlur = Math.max(4, Math.round(size * 0.1));
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, cy);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(10, 5, 20, 0.9)';
  ctx.lineWidth = Math.max(2, Math.round(size * 0.045));
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Chrome lettering (round 5): the retro-chrome 3D title the top-ranked
// posters all use. The fill is a vertical chrome gradient (white -> gold
// -> bright highlight -> amber -> deep gold), painted over a stack of
// extruded offset copies in dark purple/magenta so the letters stand
// proud of the poster, with a dark outline and a neon glow. The gradient
// is rebuilt per line from the line's own top/bottom, so both lines of a
// stacked headline get the full chrome range.
// ---------------------------------------------------------------------------
function drawChromeLine(ctx, text, cx, cy, size, accentA) {
  const step = Math.max(2, Math.round(size * 0.028));
  ctx.save();
  ctx.font = `${size}px "Anton", "Bebas Neue", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // Extrude: four copies stepping down-right in deepening purple, then
  // one cyan offset to the left for the chromatic edge.
  const extrude = ['#3b0a4d', '#2a0738', '#1c0426', '#12021a'];
  extrude.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillText(text, cx + step * (i + 1), cy + step * (i + 1));
  });
  ctx.fillStyle = 'rgba(34, 211, 238, 0.55)';
  ctx.fillText(text, cx - step, cy - step * 0.4);
  // Chrome fill: vertical gradient across the glyphs themselves.
  const top = cy - size * 0.42;
  const chrome = ctx.createLinearGradient(0, top, 0, cy + size * 0.42);
  chrome.addColorStop(0, '#fffde7');
  chrome.addColorStop(0.3, '#ffd54f');
  chrome.addColorStop(0.5, '#fff176');
  chrome.addColorStop(0.62, '#ff8f00');
  chrome.addColorStop(0.8, '#ffe082');
  chrome.addColorStop(1, '#f57f17');
  ctx.shadowColor = accentA;
  ctx.shadowBlur = Math.max(6, Math.round(size * 0.12));
  ctx.fillStyle = chrome;
  ctx.fillText(text, cx, cy);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(20, 4, 30, 0.85)';
  ctx.lineWidth = Math.max(2, Math.round(size * 0.04));
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = chrome;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function drawHeadline(ctx, text, bandY, bandH, width, accentA, accentB, style, isPoster) {
  const clean = text.trim().toUpperCase();
  if (!clean) return;
  const cx = width / 2;
  if (style === 'chrome') {
    // Round 5 default: retro-chrome 3D. Two balanced lines when the
    // headline has 2+ words, one line otherwise. The poster band is
    // ~36% of the cover height, so the chrome block reads huge.
    const lines = splitStackedHeadline(clean);
    const lineH = bandH * (isPoster ? 0.3 : 0.26);
    const size = fitHeadlineFont(
      ctx, lines.reduce((a, b) => (a.length >= b.length ? a : b)),
      width * 0.94, Math.round(lineH * 0.75), Math.round(lineH * 1.15),
    );
    if (lines.length === 1) {
      drawChromeLine(ctx, lines[0], cx, bandY + bandH * (isPoster ? 0.4 : 0.42), size, accentA);
      return;
    }
    const lineCentres = isPoster ? [0.32, 0.6] : [0.32, 0.58];
    lines.forEach((line, i) => {
      drawChromeLine(ctx, line, cx, bandY + bandH * lineCentres[i], size, accentA);
    });
    return;
  }
  if (style === 'stacked') {
    const lines = splitStackedHeadline(clean);
    // Two lines share the block. Round 4 raises the cap above the old
    // one-line slot (lineH) so the stacked headline reads bigger — but
    // NOT to the full 1.35x lineH: measured on canvas, Anton caps run
    // ~0.87x the font size and the glyphs sit high in the em box, so at
    // 1.35x the first line paints straight over the kicker (verified by
    // rendering it: "NEON BAY" vanished behind "SUNSET"). At 1.15x with
    // the lines centred at 0.34/0.67 of the band, kicker, both lines,
    // tagline (0.78) and billing all clear each other.
    const lineH = bandH * (isPoster ? 0.26 : 0.24);
    const size = fitHeadlineFont(
      ctx, lines.reduce((a, b) => (a.length >= b.length ? a : b)),
      width * 0.94, Math.round(lineH * 0.75), Math.round(lineH * 1.15),
    );
    const lineCentres = isPoster ? [bandY + bandH * 0.34, bandY + bandH * 0.67]
      : [bandY + bandH * 0.32, bandY + bandH * 0.58];
    lines.forEach((line, i) => {
      drawHeadlineLine(ctx, line, cx, lineCentres[i], size, accentA, accentB);
    });
    return;
  }
  // Round 4: the single line sits lower in the block (centred at 0.53 of
  // the band, capped at 0.56x bandH) so it stays big yet clears both the
  // kicker above it and the tagline below — at the old 0.58 centre /
  // 0.68 cap the tagline (0.78 poster, 0.87 panels) was drawn through
  // the headline's feet, and at 0.45 the kicker was clipped instead
  // (Anton caps run ~0.87x the font size, so the glyphs sit high).
  // Round 5 moves the single line to 0.42 and the tagline to 0.74 so the
  // billing strip (0.88) and the footer row (0.985) fit below it.
  const size = fitHeadlineFont(
    ctx, clean, width * 0.94, Math.round(bandH * 0.40), Math.round(bandH * 0.52),
  );
  drawHeadlineLine(ctx, clean, cx, bandY + bandH * 0.42, size, accentA, accentB);
}

function drawKicker(ctx, text, bandY, bandH, width, accent, isPoster) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return;
  // Round 5: on the tall poster band the kicker sits higher and smaller,
  // so the big chrome headline never paints over it (shot 3 QA: at
  // 0.11/0.12x the kicker ghosted behind "BOULEVARD").
  const size = Math.max(12, Math.round(bandH * (isPoster ? 0.09 : 0.12)));
  const yFrac = isPoster ? 0.06 : 0.1;
  ctx.save();
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.42)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.fillText(clean, width / 2, bandY + bandH * yFrac);
  ctx.restore();
}

/** Shrink a spaced-caps line until it fits the cover width. */
function fitCapsLine(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.28)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  while (size > 11 && ctx.measureText(text).width > maxWidth) {
    size = Math.round(size * 0.92);
    ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(size * 0.28)}px`;
    } catch {
      // older canvas: letterSpacing is ignored, text still draws
    }
  }
  return size;
}

function drawTagline(ctx, text, bandY, bandH, width, yFrac) {
  const clean = text.trim();
  if (!clean) return;
  const size = fitCapsLine(ctx, clean.toUpperCase(), width * 0.94, Math.max(13, Math.round(bandH * 0.11)));
  ctx.save();
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.28)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(clean.toUpperCase(), width / 2, bandY + bandH * yFrac);
  ctx.restore();
}

/** The billing strip: small spaced caps between two hairline rules. */
function drawBillingStrip(ctx, text, bandY, bandH, width, accent, yFrac = 0.88) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return;
  const y = bandY + bandH * yFrac;
  const size = fitCapsLine(ctx, clean, width * 0.84, Math.max(11, Math.round(bandH * 0.075)));
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, y - size * 1.1);
  ctx.lineTo(width * 0.92, y - size * 1.1);
  ctx.stroke();
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    // Same spacing fitCapsLine measured with, so the fitted size holds.
    ctx.letterSpacing = `${Math.round(size * 0.28)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.fillText(clean, width / 2, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Credits line (round 6): a second small-caps line under the billing
// strip — cast credits on the panel posters, a production credit
// otherwise. It fills the dark gap round 5 left between the billing
// strip and the barcode/COMING SOON row. Panel layouts only: the Movie
// Poster band is already full (kicker + two-line chrome headline +
// tagline + billing + footer), and a centred line there would collide
// with the barcode on the left and COMING SOON on the right.
// ---------------------------------------------------------------------------
function drawCreditsLine(ctx, text, bandY, bandH, width) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return;
  // 0.94 of the band: below the billing strip (0.86), above the footer
  // row — centred, so it clears the barcode (left) and COMING SOON
  // (right) at every export size.
  const y = bandY + bandH * 0.94;
  const size = fitCapsLine(ctx, clean, width * 0.84, Math.max(11, Math.round(bandH * 0.055)));
  ctx.save();
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.28)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillText(clean, width / 2, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Poster furniture (round 5): the bits that make a poster read as a real
// poster instead of a collage. All of it is default-on, on EVERY layout:
// a quote strip with stars across the top of the photo area, a VOL.
// badge, a gold starburst seal, a billing strip, a barcode and a
// COMING SOON footer. Plus a role-tag chip on every panel, auto-filled
// from the cast list and editable in the editor.
// ---------------------------------------------------------------------------

/** Quote strip: five stars + quote + source, across the top of the art. */
function drawQuoteStrip(ctx, w, h, quote, source) {
  const clean = (quote || '').trim();
  if (!clean) return;
  const stripH = Math.max(26, Math.round(h * 0.04));
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 20, 0.72)';
  ctx.fillRect(0, 0, w, stripH);
  const size = Math.max(12, Math.round(stripH * 0.52));
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.22)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const line = `★★★★★  ${clean.toUpperCase()}  —  ${(source || '').trim().toUpperCase()}`;
  ctx.fillStyle = '#ffd968';
  ctx.fillText(line, w / 2, stripH / 2 + 1);
  ctx.restore();
}

/** "VOL. 1" badge, top-left under the quote strip. */
function drawVolBadge(ctx, h, volume) {
  const clean = (volume || '').trim().toUpperCase();
  if (!clean) return;
  const stripH = Math.max(26, Math.round(h * 0.04));
  const size = Math.max(13, Math.round(h * 0.016));
  ctx.save();
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  const textW = ctx.measureText(clean).width;
  const padX = Math.round(size * 0.7);
  const padY = Math.round(size * 0.32);
  const bw = textW + padX * 2;
  const bh = size + padY * 2;
  const x = 12;
  const y = stripH + 10;
  ctx.fillStyle = 'rgba(10, 4, 20, 0.78)';
  ctx.strokeStyle = '#ffd968';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, Math.round(bh / 2));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd968';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(clean, x + bw / 2, y + bh / 2 + 1);
  ctx.restore();
}

/** Gold starburst seal: "ORIGINAL COVER ART", bottom-right of the art. */
function drawGoldSeal(ctx, w, photoH, h) {
  const r = Math.max(34, Math.round(Math.min(w, h) * 0.055));
  const cx = w - r - 16;
  const cy = photoH - r - 14;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  // Twelve-point starburst.
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.84;
    const px = Math.cos(angle) * rad;
    const py = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#f5c542';
  ctx.fill();
  ctx.strokeStyle = '#8a6d1a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd968';
  ctx.fill();
  ctx.stroke();
  // Two lines of seal text, dark on gold. Reset letterSpacing explicitly:
  // the quote strip / role tags set wide spacing earlier in the same
  // render, and without the reset the seal text spreads wider than its
  // circle and the outer letters get clipped (shot 3 QA).
  const size = Math.max(10, Math.round(r * 0.2));
  ctx.fillStyle = '#5a3d00';
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ORIGINAL', 0, -size * 0.55);
  ctx.fillText('COVER ART', 0, size * 0.55);
  ctx.restore();
}

/** Role-tag chip on one panel: gold dot + spaced caps, bottom-left. */
function drawRoleTag(ctx, panel, tag) {
  const clean = (tag || '').trim().toUpperCase();
  if (!clean) return;
  const { x, y, w, h } = panel;
  const pillH = Math.max(18, Math.round(h * 0.11));
  const size = Math.max(11, Math.round(pillH * 0.52));
  ctx.save();
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.18)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  const textW = ctx.measureText(clean).width;
  const padX = Math.round(size * 0.6);
  const dotR = Math.max(3, Math.round(size * 0.22));
  const bw = textW + padX * 2 + dotR * 2 + 6;
  const bx = x + 8;
  const by = y + h - pillH - 8;
  ctx.fillStyle = 'rgba(10, 4, 20, 0.85)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, pillH, Math.round(pillH / 2));
  ctx.fill();
  ctx.fillStyle = '#ffd968';
  ctx.beginPath();
  ctx.arc(bx + padX + dotR, by + pillH / 2, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(clean, bx + padX + dotR * 2 + 6, by + pillH / 2 + 1);
  ctx.restore();
}

/** Deterministic barcode block (black bars on white). */
function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  const rand = mulberry32(7);
  ctx.fillStyle = '#111111';
  let bx = x + 3;
  const innerH = h - 6;
  while (bx < x + w - 4) {
    const bw = 1 + Math.floor(rand() * 4);
    const gap = 1 + Math.floor(rand() * 3);
    if (rand() > 0.42) ctx.fillRect(bx, y + 3, bw, innerH);
    bx += bw + gap;
  }
  ctx.restore();
}

/** "COMING SOON" footer text, right-aligned. */
function drawComingSoon(ctx, w, y, size, accent) {
  ctx.save();
  ctx.font = `600 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(size * 0.3)}px`;
  } catch {
    // older canvas: letterSpacing is ignored, text still draws
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.fillText('COMING SOON', w - 14, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main entry: render the whole cover onto `canvas` at its own pixel size.
// Order: photos, grade, halftone, skyline strip, neon seam, headline
// block (kicker, headline, tagline, billing), footer, vignette + grain.
// ---------------------------------------------------------------------------
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADE_DEFS[state.grade] ?? GRADE_DEFS.sunset;
  const strength = state.gradeStrength ?? 1;
  const bandH = headlineBandHeight(state.layout, h);
  const bandY = h - bandH;
  const skyH = skylineStripHeight(state, h);
  const photoH = h - bandH - skyH;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  // Panels.
  const panels = layoutPanels(state.layout, w, h, state);
  const count = state.layout === 'full' || state.layout === 'poster'
    ? 1 : state.layout === 'cast' ? CAST_PANEL_COUNT : PANEL_COUNT;
  for (let i = 0; i < count; i += 1) {
    const slot = state.panels[i] ?? { photo: 0, zoom: 1, fx: 0.5, fy: 0.5 };
    const img = state.photos[slot.photo] ?? null;
    if (img) {
      drawPhotoInPanel(ctx, img, panels[i], slot.zoom, slot.fx, slot.fy, grade.sat);
    } else {
      drawEmptyPanel(ctx, panels[i], `PANEL ${i + 1} — ADD A PHOTO`);
    }
  }

  // Round 6 pop-out hero (hero3 only, state.popout): the hero panel is
  // redrawn last, breaking the grid — its photo overhangs the right-hand
  // panels by one overhang and carries a drop shadow, so the hero reads
  // as a card lifted in front of the poster instead of one more tile.
  // It is a grid-break, not a true cut-out (that needs a segmentation
  // mask, which a static offline app has no way to make): the figure
  // stays inside its photo, the CARD breaks out. The role tags are drawn
  // later (furniture pass), so no chip is ever covered, and the overhang
  // never extends downward into the headline band.
  if (state.popout && state.layout === 'hero3' && count > 0) {
    const slot = state.panels[0] ?? { photo: 0, zoom: 1, fx: 0.5, fy: 0.5 };
    const img = state.photos[slot.photo] ?? null;
    if (img) drawPopoutHero(ctx, img, panels[0], slot, grade.sat);
  }

  // Grade over the photo area: veil + overlay + sun glow.
  applyGrade(ctx, w, photoH, grade, strength);
  // Print-dot halftone over the photos, when the user asked for it.
  if (state.halftone) drawHalftoneTexture(ctx, w, photoH);

  // Round 5 furniture over the photo area: quote strip, VOL. badge, gold
  // seal, and one role-tag chip per panel.
  drawQuoteStrip(ctx, w, h, state.quote, state.quoteSource);
  drawVolBadge(ctx, h, state.volume);
  drawGoldSeal(ctx, w, photoH, h);
  const tags = state.castTags ?? [];
  for (let i = 0; i < count; i += 1) {
    drawRoleTag(ctx, panels[i], tags[i] ?? '');
  }

  // Sunset skyline strip between the photos and the headline block.
  if (skyH > 0) drawSkylineFrame(ctx, 0, photoH, w, skyH);

  // Neon accent line where the skyline strip meets the headline block.
  ctx.save();
  const seam = ctx.createLinearGradient(0, 0, w, 0);
  seam.addColorStop(0, grade.accentB);
  seam.addColorStop(0.5, grade.accentA);
  seam.addColorStop(1, grade.accentB);
  ctx.fillStyle = seam;
  ctx.fillRect(0, photoH + skyH - 2, w, 4);
  ctx.restore();

  // Headline block: deep dusk gradient so the lettering always reads.
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, h);
  bandGrad.addColorStop(0, '#1d0b33');
  bandGrad.addColorStop(1, '#0a0416');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, w, bandH);

  // Round 5: every layout gets the full poster furniture — kicker,
  // headline (chrome by default), tagline, billing strip — and the
  // footer row (barcode + COMING SOON) at the very bottom of the band.
  const isPoster = state.layout === 'poster';
  drawKicker(ctx, state.kicker, bandY, bandH, w, grade.accentA, isPoster);
  drawHeadline(ctx, state.headline, bandY, bandH, w, grade.accentA, grade.accentB, state.letteringStyle, isPoster);
  drawTagline(ctx, state.tagline, bandY, bandH, w, isPoster ? 0.78 : 0.72);
  drawBillingStrip(ctx, state.billing, bandY, bandH, w, grade.accentB, isPoster ? 0.88 : 0.86);
  // Round 6: the credits line fills the panel band's dark gap (see
  // drawCreditsLine); the poster band skips it — it is already full.
  if (!isPoster) drawCreditsLine(ctx, state.credits, bandY, bandH, w);

  // Footer row: barcode bottom-left, COMING SOON bottom-right.
  const barH = Math.max(12, Math.round(bandH * 0.09));
  drawBarcode(ctx, 14, h - barH - 8, Math.round(w * 0.09), barH);
  drawComingSoon(ctx, w, h - 8, Math.max(11, Math.round(bandH * 0.075)), grade.accentA);

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

/** The story export: a tall 1080x1920 cover for vertical feeds. */
export function exportStoryPng(state) {
  return exportCoverPng(state, 1080, 1920);
}
