// Fixed scenes for screenshots and the headless export self-test.
//
//   ?shot=cover   — editor chrome hidden, cover fills the viewport.
//   ?shot=editor  — the full editor with a sample photo loaded.
//   ?shot=export-test — runs the export path headlessly and reports
//                        window.__exportOk (blob size > 0).
// Extra params: ?photo=pier|boulevard, ?caption=…, ?layout=…, ?grade=…,
// ?size=1080x1080|1080x1350|1920x1080|1080x1920, ?strength=…,
// ?lettering=single|stacked|chrome, ?skyline=0|1, ?halftone=0|1, ?billing=…,
// ?preset=vice-sunset|neon-nights|golden-hour|cast-crew,
// ?cast=driver,boss,mechanic,queen,pier,boulevard (sample per slot, in
// order — the panels are framed on each sample's face), ?tags=THE DRIVER|…
// (role tag per panel, | separated), ?quote=…, ?quotesource=…, ?vol=…,
// ?kicker=….
// window.__shotReady is set once the scene has painted with its display
// fonts loaded.
import {
  exportCoverPng, exportStoryPng, panelDefaults, applyPosterPreset,
  castPanelDefaults, CAST_SAMPLES, DEFAULT_CAST_TAGS,
  LAYOUTS, GRADES, LETTERING_STYLES,
} from './cover.js';

const SAMPLES = ['pier', 'boulevard'];
const KNOWN_SAMPLES = ['driver', 'boss', 'mechanic', 'queen', 'pier', 'boulevard'];

async function waitForFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load('64px Anton'),
      document.fonts.load('32px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch {
    // Fallback fonts still render; the scene is usable either way.
  }
}

function paintWhenReady(api) {
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    document.title = 'shot-ready';
  }));
}

/** Mirror the scene's state back into the editor controls. */
function syncSceneControls(api) {
  if (typeof api.syncAllControls === 'function') api.syncAllControls();
}

export async function runShot(shot, query, api) {
  const { state } = api;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  if (shot === 'export-test') {
    try {
      await api.loadSampleIntoSlot(0, 'pier');
      await waitForFonts();
      api.redraw();
      const blob = await exportCoverPng(state, 1080, 1080);
      const storyBlob = await exportStoryPng(state);
      window.__exportOk = blob instanceof Blob && blob.size > 0
        && storyBlob instanceof Blob && storyBlob.size > 0;
      api.setStatus(window.__exportOk ? `export-ok ${blob.size} bytes` : 'export-failed');
    } catch {
      window.__exportOk = false;
      api.setStatus('export-failed');
    }
    document.title = window.__exportOk ? 'export-ok' : 'export-failed';
    window.__shotReady = true;
    return;
  }

  // cover + editor: deterministic scene from the query string.
  const photo = query.get('photo') ?? 'pier';
  const other = SAMPLES.find((s) => s !== photo) ?? 'boulevard';
  const size = query.get('size') ?? (shot === 'cover' ? '1920x1080' : '1080x1080');
  const [w, h] = size.split('x').map(Number);
  if (Number.isFinite(w) && Number.isFinite(h)) api.setCanvasSize(w, h);

  // Round 3: a preset may set the whole look first; the query params
  // below then override individual pieces, so a shot can say
  // "the Vice Sunset preset, but with the other sample photo".
  const preset = query.get('preset');
  if (preset) applyPosterPreset(state, preset);

  const layout = query.get('layout');
  if (layout && LAYOUTS.includes(layout)) {
    state.layout = layout;
    // The layout's own tuned framing, so the shot shows whole faces and
    // clearly different crops per panel.
    state.panels = panelDefaults(layout);
  }
  const grade = query.get('grade');
  if (grade && GRADES.includes(grade)) state.grade = grade;
  const strength = Number(query.get('strength'));
  if (Number.isFinite(strength) && strength >= 0.5 && strength <= 1.5) {
    state.gradeStrength = strength;
  }
  // Round 3 scene switches: stacked lettering, the skyline frame, the
  // halftone print texture, and the billing strip text.
  const lettering = query.get('lettering');
  if (lettering && LETTERING_STYLES.includes(lettering)) {
    state.letteringStyle = lettering;
  }
  const skyline = query.get('skyline');
  if (skyline === '1') state.skylineFrame = true;
  if (skyline === '0') state.skylineFrame = false;
  const halftone = query.get('halftone');
  if (halftone === '1') state.halftone = true;
  if (halftone === '0') state.halftone = false;
  const billing = query.get('billing');
  if (billing !== null) state.billing = billing;
  state.headline = query.get('caption') ?? 'Sunset Heist';
  const tagline = query.get('tagline');
  if (tagline !== null) state.tagline = tagline;
  const kicker = query.get('kicker');
  if (kicker !== null) state.kicker = kicker;
  // Round 5 scene switches: the cast (one sample per slot, in order),
  // the role tag per panel, and the poster furniture texts.
  const quote = query.get('quote');
  if (quote !== null) state.quote = quote;
  const quoteSource = query.get('quotesource');
  if (quoteSource !== null) state.quoteSource = quoteSource;
  const vol = query.get('vol');
  if (vol !== null) state.volume = vol;
  const tags = query.get('tags');
  if (tags !== null) {
    const parsed = tags.split('|').map((t) => t.trim().toUpperCase()).filter(Boolean);
    for (let i = 0; i < DEFAULT_CAST_TAGS.length; i += 1) {
      state.castTags[i] = parsed[i] ?? DEFAULT_CAST_TAGS[i];
    }
  }
  const castParam = query.get('cast');
  const cast = castParam
    ? castParam.split(',').map((s) => s.trim()).filter((s) => KNOWN_SAMPLES.includes(s))
    : null;

  if (cast && cast.length > 0) {
    for (let i = 0; i < cast.length; i += 1) {
      await api.loadSampleIntoSlot(i, cast[i]);
    }
    // Each panel gets its own cast member, framed on the face.
    state.panels = castPanelDefaults(state.layout, cast);
  } else {
    await api.loadSampleIntoSlot(0, photo);
    await api.loadSampleIntoSlot(1, other);
  }
  await waitForFonts();
  syncSceneControls(api);
  api.setStatus('Ready — pick a photo, edit the caption, export a PNG.');
  paintWhenReady(api);
}
