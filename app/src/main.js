// Neon Bay Cover Studio — wiring: photo slots, panel framing, caption edits,
// exports, and the deterministic screenshot scenes (./shots.js).
import { renderCover, exportCoverPng, layoutPanels, panelDefaults, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// State: library slots hold the photos; each panel points at a slot and keeps
// its own zoom + focus point, so one photo can fill several panels cropped
// differently. Headline/tagline live outside the panels, in their own band.
// ---------------------------------------------------------------------------
const state = {
  layout: 'grid4',
  grade: 'sunset',
  gradeStrength: 1, // grade-strength slider, 0.5..1.5 (round 2)
  headline: 'Sunset Heist',
  tagline: 'One last score under the neon sun',
  footer: 'Neon Bay',
  kicker: 'Neon Bay', // small brand line above the headline (round 2)
  photos: [null, null, null, null], // HTMLImageElement | null
  photoNames: ['', '', '', ''],
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
// Inputs.
// ---------------------------------------------------------------------------
$('photo-files').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    const slot = firstEmptySlot();
    if (slot === -1) {
      setStatus('All 4 photo slots are full — remove one first.');
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
  if (slot === -1) return setStatus('All 4 photo slots are full — remove one first.');
  await loadSampleIntoSlot(slot, 'pier');
  setStatus(`Sample pier.jpg loaded into slot ${slot + 1}.`);
});
$('sample-boulevard').addEventListener('click', async () => {
  const slot = firstEmptySlot();
  if (slot === -1) return setStatus('All 4 photo slots are full — remove one first.');
  await loadSampleIntoSlot(slot, 'boulevard');
  setStatus(`Sample boulevard.jpg loaded into slot ${slot + 1}.`);
});

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
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const hit = panels.findIndex(
    (p) => point.x >= p.x && point.x < p.x + p.w && point.y >= p.y && point.y < p.y + p.h,
  );
  if (hit === -1) return;
  selectedPanel = state.layout === 'full' ? 0 : hit;
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
    setCanvasSize(w, h) {
      canvas.width = w;
      canvas.height = h;
    },
  });
} else {
  (async () => {
    await Promise.all([
      loadSampleIntoSlot(0, 'pier'),
      loadSampleIntoSlot(1, 'boulevard'),
    ]).catch(() => setStatus('Sample photos could not be loaded.'));
    redraw();
    setStatus('Ready — pick a photo, edit the caption, export a PNG.');
  })();
  if (document.fonts?.ready) document.fonts.ready.then(redraw);
}
