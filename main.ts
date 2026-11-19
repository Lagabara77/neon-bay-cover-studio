// Neon Bay Cover Studio — make.fun entry point (Node 22, standard library only).
//
// Round 2: same hand-in shape as round 1 — copy app/ and screenshots/ next
// to this file into the output directory, then write dossier.json with the
// vendored make.fun library — plus a fail-fast check that the app entry
// point is actually there before anything is copied.
//
// The app itself is plain static files under app/ (index.html plus ES
// modules, no build step, no network requests).
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

// Fail fast with a readable error instead of handing in a broken entry.
if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error(`app/index.html is missing under ${appDir} — nothing to hand in`);
}
if (!existsSync(shotsDir)) {
  throw new Error(`screenshots/ is missing under ${here} — the entry needs its shots`);
}

// Copy the app first so the dossier measures exactly what is handed in.
mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (from the kit's reference/gate.json): only
// text_max_bytes shapes the dossier bytes; the other limits refuse an entry
// the scorer would refuse — more than 4 screenshots or one over 256 KiB,
// more than 993 files in app/ or 48 MiB of app files in all, or a path under
// app/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
