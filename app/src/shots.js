// Fixed scenes for screenshots and the headless export self-test.
//
//   ?shot=cover   — editor chrome hidden, cover fills the viewport.
//   ?shot=editor  — the full editor with a sample photo loaded.
//   ?shot=export-test — runs the export path headlessly and reports
//                        window.__exportOk (blob size > 0).
// Extra params: ?photo=pier|boulevard, ?caption=…, ?layout=…, ?grade=…,
// ?size=1080x1080|1080x1350|1920x1080. window.__shotReady is set once the
// scene has painted with its display fonts loaded.
import { exportCoverPng, panelDefaults, LAYOUTS, GRADES } from './cover.js';

const SAMPLES = ['pier', 'boulevard'];

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
      window.__exportOk = blob instanceof Blob && blob.size > 0;
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

  const layout = query.get('layout');
  if (layout && LAYOUTS.includes(layout)) {
    state.layout = layout;
    // Round 2: the layout's own tuned framing, so the shot shows whole
    // faces and clearly different crops per panel.
    state.panels = panelDefaults(layout);
  }
  const grade = query.get('grade');
  if (grade && GRADES.includes(grade)) state.grade = grade;
  // Round 2: ?strength= lets a shot push the grade a little harder
  // (within the slider's own 0.5..1.5 range) and keeps the editor slider
  // in sync with what the preview actually renders.
  const strength = Number(query.get('strength'));
  if (Number.isFinite(strength) && strength >= 0.5 && strength <= 1.5) {
    state.gradeStrength = strength;
    const slider = document.getElementById('grade-strength');
    const label = document.getElementById('grade-strength-value');
    if (slider) slider.value = String(strength);
    if (label) label.textContent = `${strength.toFixed(2)}×`;
  }
  state.headline = query.get('caption') ?? 'Sunset Heist';
  const tagline = query.get('tagline');
  if (tagline !== null) state.tagline = tagline;

  await api.loadSampleIntoSlot(0, photo);
  await api.loadSampleIntoSlot(1, other);
  await waitForFonts();
  api.setStatus('Ready — pick a photo, edit the caption, export a PNG.');
  paintWhenReady(api);
}
