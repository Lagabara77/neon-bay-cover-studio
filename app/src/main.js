// Neon Bay Cover Studio — wiring: photo slots, panel framing, caption edits,
// one-tap poster presets, exports (square, portrait, wide, story), and the
// deterministic screenshot scenes (./shots.js).
import {
  renderCover, exportCoverPng, exportStoryPng, layoutPanels, panelDefaults,
  applyPosterPreset, castPanelDefaults, CAST_SAMPLES, DEFAULT_CAST_TAGS,
  LAYOUTS, GRADES, LETTERING_STYLES,
} from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// State: library slots hold the photos; each panel points at a slot and keeps
// its own zoom + focus point, so one photo can fill several panels cropped
// differently. Headline/tagline live outside the panels, in their own band.
// Round 3 adds: the skyline frame toggle, the halftone print texture, the
// stacked lettering style, and the billing strip under the tagline.
// ---------------------------------------------------------------------------
const state = {
  layout: 'grid4',
  grade: 'sunset',
  gradeStrength: 1, // grade-strength slider, 0.5..1.5 (round 2)
  headline: 'Sunset Heist',
  tagline: 'One last score under the neon sun',
  footer: 'Neon Bay',
  kicker: 'Neon Bay', // small brand line above the headline (round 2)
  billing: 'A Neon Bay Production', // billing strip (round 3)
  letteringStyle: 'chrome', // 'single' | 'stacked' | 'chrome' (round 5: chrome default)
  skylineFrame: true, // sunset skyline strip under the photos (round 3)
  halftone: false, // print-dot texture over the photos (round 3)
  quote: 'The coolest crew on the coast', // quote strip (round 5)
  quoteSource: 'Neon Bay Gazette',
  volume: 'VOL. 1', // VOL. badge (round 5)
  castTags: [...DEFAULT_CAST_TAGS], // role tag per panel (round 5)
  photos: [null, null, null, null, null, null], // HTMLImageElement | null
  photoNames: ['', '', '', '', '', ''],
  // Round 2: framing defaults come from the renderer, tuned per layout so
  // faces stay whole and the four panels show different crops.
  panels: panelDefaults('grid4'),
};
let selectedPanel = 0;

function redraw() {
  renderCover(canvas, state);
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function firstEmptySlot() {
  return state.photos.findIndex((p) => p === null);
}

async function fillSlot(index, img, name) {
  state.photos[index] = img;
  state.photoNames[index] = name;
  refreshSlots();
  refreshPanelPhotoOptions();
  redraw();
}

async function loadSampleIntoSlot(index, sample) {
  const img = await loadImage(`samples/${sample}.jpg`);
  await fillSlot(index, img, `${sample}.jpg (sample)`);
  return img;
}

// ---------------------------------------------------------------------------
// Slots UI: four rows showing what each library slot holds.
// ---------------------------------------------------------------------------
function refreshSlots() {
  const box = $('slots');
  box.innerHTML = '';
  state.photos.forEach((img, i) => {
    const row = document.createElement('div');
    row.className = `slot${img ? ' filled' : ''}`;
    const label = document.createElement('span');
    label.textContent = img ? `Slot ${i + 1}: ${state.photoNames[i]}` : `Slot ${i + 1}: empty`;
    row.appendChild(label);
    if (img) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.textContent = 'Remove';
      clear.addEventListener('click', () => {
        state.photos[i] = null;
        state.photoNames[i] = '';
        refreshSlots();
        refreshPanelPhotoOptions();
        redraw();
      });
      row.appendChild(clear);
    }
    box.appendChild(row);
  });
}

function refreshPanelPhotoOptions() {
  const select = $('panel-photo');
  const current = Number(select.value || state.panels[selectedPanel].photo);
  select.innerHTML = '';
  state.photos.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = img ? `Slot ${i + 1} — ${state.photoNames[i]}` : `Slot ${i + 1} — empty`;
    opt.disabled = !img;
    select.appendChild(opt);
  });
  select.value = String(state.photos[current] ? current : state.photos.findIndex(Boolean));
  select.value = select.value === '-1' ? '0' : select.value;
}

// ---------------------------------------------------------------------------
// One-tap poster presets (round 3): one button sets layout + grade +
// lettering + skyline + halftone + grade strength, then every control is
// re-synced so the editor shows exactly what the preset chose.
// ---------------------------------------------------------------------------
function syncAllControls() {
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  $('grade-strength').value = String(state.gradeStrength);
  $('grade-strength-value').textContent = `${state.gradeStrength.toFixed(2)}×`;
  $('lettering').value = state.letteringStyle;
  $('skyline-frame').checked = state.skylineFrame;
  $('halftone').checked = state.halftone;
  $('headline').value = state.headline;
  $('tagline').value = state.tagline;
  $('billing').value = state.billing;
  $('cast-tags').value = state.castTags.join(', ');
  syncPanelControls();
}

function usePosterPreset(name, label) {
  if (!applyPosterPreset(state, name)) return;
  syncAllControls();
  redraw();
  setStatus(`${label} preset applied — export a PNG when it looks right.`);
}

$('preset-vice').addEventListener('click', () => usePosterPreset('vice-sunset', 'Vice Sunset'));
$('preset-neon').addEventListener('click', () => usePosterPreset('neon-nights', 'Neon Nights'));
$('preset-golden').addEventListener('click', () => usePosterPreset('golden-hour', 'Golden Hour'));
$('preset-cast').addEventListener('click', () => usePosterPreset('cast-crew', 'Cast Crew'));

// ---------------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------------
// Round 5: one button loads all six sample portraits into the six slots,
// so the cast is complete in one tap and no slot is ever empty.
$('sample-all').addEventListener('click', async () => {
  let loaded = 0;
  for (let i = 0; i < CAST_SAMPLES.length; i += 1) {
    if (!state.photos[i]) {
      try {
        await loadSampleIntoSlot(i, CAST_SAMPLES[i]);
        loaded += 1;
      } catch {
        // Keep going with the samples that did load.
      }
    }
  }
  // Point every panel at its own cast member, framed on the face.
  state.panels = castPanelDefaults(state.layout, CAST_SAMPLES);
  syncPanelControls();
  redraw();
  setStatus(loaded > 0 ? `Loaded ${loaded} sample photos — the cast is complete.` : 'All 6 sample photos are already loaded.');
});
$('photo-files').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    const slot = firstEmptySlot();
    if (slot === -1) {
      setStatus('All 6 photo slots are full — remove one first.');
      break;
    }
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await fillSlot(slot, img, file.name);
      setStatus(`Loaded ${file.name} into slot ${slot + 1}.`);
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  event.target.value = '';
});

$('sample-pier').addEventListener('click', async () => {
  const slot = firstEmptySlot();
  if (slot === -1) return setStatus('All 6 photo slots are full — remove one first.');
  await loadSampleIntoSlot(slot, 'pier');
  setStatus(`Sample pier.jpg loaded into slot ${slot + 1}.`);
});
$('sample-boulevard').addEventListener('click', async () => {
  const slot = firstEmptySlot();
  if (slot === -1) return setStatus('All 6 photo slots are full — remove one first.');
  await loadSampleIntoSlot(slot, 'boulevard');
  setStatus(`Sample boulevard.jpg loaded into slot ${slot + 1}.`);
});
for (const sample of ['driver', 'boss', 'mechanic', 'queen']) {
  $(`sample-${sample}`).addEventListener('click', async () => {
    const slot = firstEmptySlot();
    if (slot === -1) return setStatus('All 6 photo slots are full — remove one first.');
    await loadSampleIntoSlot(slot, sample);
    setStatus(`Sample ${sample}.jpg loaded into slot ${slot + 1}.`);
  });
}

$('layout').addEventListener('change', (e) => {
  if (LAYOUTS.includes(e.target.value)) {
    state.layout = e.target.value;
    // A new layout gets its own tuned framing — the old crops belong to
    // the old panel shapes (round 2).
    state.panels = panelDefaults(state.layout);
    syncPanelControls();
  }
  redraw();
});
$('grade').addEventListener('change', (e) => {
  if (GRADES.includes(e.target.value)) state.grade = e.target.value;
  redraw();
});
$('grade-strength').addEventListener('input', (e) => {
  state.gradeStrength = Number(e.target.value);
  $('grade-strength-value').textContent = `${state.gradeStrength.toFixed(2)}×`;
  redraw();
});
$('lettering').addEventListener('change', (e) => {
  if (LETTERING_STYLES.includes(e.target.value)) state.letteringStyle = e.target.value;
  redraw();
});
$('skyline-frame').addEventListener('change', (e) => {
  state.skylineFrame = e.target.checked;
  redraw();
});
$('halftone').addEventListener('change', (e) => {
  state.halftone = e.target.checked;
  redraw();
});
$('size').addEventListener('change', (e) => {
  const [w, h] = e.target.value.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  redraw();
});
$('headline').addEventListener('input', (e) => {
  state.headline = e.target.value;
  redraw();
});
$('tagline').addEventListener('input', (e) => {
  state.tagline = e.target.value;
  redraw();
});
$('billing').addEventListener('input', (e) => {
  state.billing = e.target.value;
  redraw();
});
$('cast-tags').addEventListener('input', (e) => {
  // One comma-separated field, one tag per panel, in panel order.
  const tags = e.target.value.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
  for (let i = 0; i < DEFAULT_CAST_TAGS.length; i += 1) {
    state.castTags[i] = tags[i] ?? DEFAULT_CAST_TAGS[i];
  }
  redraw();
});

// Panel framing controls apply to the selected panel.
$('panel-select').addEventListener('change', (e) => {
  selectedPanel = Number(e.target.value);
  syncPanelControls();
});
$('panel-photo').addEventListener('change', (e) => {
  state.panels[selectedPanel].photo = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  $('zoom-value').textContent = `${Number(e.target.value).toFixed(2)}×`;
  redraw();
});
$('reset-frame').addEventListener('click', () => {
  state.panels[selectedPanel].zoom = 1;
  state.panels[selectedPanel].fx = 0.5;
  state.panels[selectedPanel].fy = 0.5;
  syncPanelControls();
  redraw();
});

function syncPanelControls() {
  const slot = state.panels[selectedPanel];
  $('panel-select').value = String(selectedPanel);
  $('panel-photo').value = String(slot.photo);
  $('zoom').value = String(slot.zoom);
  $('zoom-value').textContent = `${slot.zoom.toFixed(2)}×`;
}

// ---------------------------------------------------------------------------
// Drag to pan: pointer down picks the panel under the cursor and selects it;
// dragging moves the focus point, so the photo slides inside its window.
// Uniform scale is preserved — dragging never stretches anything.
// ---------------------------------------------------------------------------
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const panels = layoutPanels(state.layout, canvas.width, canvas.height, state);
  const hit = panels.findIndex(
    (p) => point.x >= p.x && point.x < p.x + p.w && point.y >= p.y && point.y < p.y + p.h,
  );
  if (hit === -1) return;
  selectedPanel = state.layout === 'full' || state.layout === 'poster' ? 0 : hit;
  syncPanelControls();
  const slot = state.panels[selectedPanel];
  const img = state.photos[slot.photo];
  if (!img) return;
  const panel = panels[selectedPanel];
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(panel.w / iw, panel.h / ih) * Math.max(1, slot.zoom);
  drag = { x: point.x, y: point.y, drawnW: iw * scale, drawnH: ih * scale };
  canvas.classList.add('dragging');
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const slot = state.panels[selectedPanel];
  slot.fx = Math.min(1, Math.max(0, slot.fx - (point.x - drag.x) / drag.drawnW));
  slot.fy = Math.min(1, Math.max(0, slot.fy - (point.y - drag.y) / drag.drawnH));
  drag.x = point.x;
  drag.y = point.y;
  redraw();
});
for (const end of ['pointerup', 'pointercancel']) {
  canvas.addEventListener(end, () => {
    drag = null;
    canvas.classList.remove('dragging');
  });
}

// ---------------------------------------------------------------------------
// Export: render offscreen at the real export size, download the PNG.
// ---------------------------------------------------------------------------
async function exportSize(width, height) {
  setStatus(`Exporting ${width}×${height}…`);
  try {
    const blob = await exportCoverPng(state, width, height);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${width}x${height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    setStatus(`Saved cover-${width}x${height}.png`);
  } catch {
    setStatus('Export failed — please try again.');
  }
}
$('export-square').addEventListener('click', () => exportSize(1080, 1080));
$('export-portrait').addEventListener('click', () => exportSize(1080, 1350));
$('export-wide').addEventListener('click', () => exportSize(1920, 1080));

/** Story export (round 3): the tall 1080x1920 cover for vertical feeds. */
async function exportStory() {
  setStatus('Exporting 1080×1920…');
  try {
    const blob = await exportStoryPng(state);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cover-1080x1920.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    setStatus('Saved cover-1080x1920.png');
  } catch {
    setStatus('Export failed — please try again.');
  }
}
$('export-story').addEventListener('click', exportStory);

// ---------------------------------------------------------------------------
// Boot: preload the two samples so a cover is already rendered on first
// paint, then re-render once the display fonts arrive.
// ---------------------------------------------------------------------------
refreshSlots();
refreshPanelPhotoOptions();
syncPanelControls();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state,
    canvas,
    redraw,
    loadSampleIntoSlot,
    setStatus,
    syncAllControls,
    setCanvasSize(w, h) {
      canvas.width = w;
      canvas.height = h;
    },
  });
} else {
  (async () => {
    // Round 5: all six sample portraits preload, so the cast is complete
    // and every slot is filled on first paint — never an empty slot.
    await Promise.all(
      CAST_SAMPLES.map((sample, i) => loadSampleIntoSlot(i, sample)),
    ).catch(() => setStatus('Sample photos could not be loaded.'));
    state.panels = castPanelDefaults(state.layout, CAST_SAMPLES);
    redraw();
    setStatus('Ready — pick a photo, edit the caption, export a PNG.');
  })();
  if (document.fonts?.ready) document.fonts.ready.then(redraw);
}
