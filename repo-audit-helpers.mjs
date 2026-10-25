import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export const workerSource = readFileSync(join(root, 'OceanHub_SECURITY_PATCHED_FINAL_v18.js'), 'utf8');
export const productionConfig = JSON.parse(readFileSync(join(root, 'wrangler.production_v18.jsonc'), 'utf8'));
export const packageManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

export function functionSection(startMarker, endMarker) {
  const start = workerSource.indexOf(startMarker);
  if (start < 0) throw new Error('No se encontró el marcador: ' + startMarker);
  const end = endMarker ? workerSource.indexOf(endMarker, start + startMarker.length) : -1;
  return workerSource.slice(start, end < 0 ? Math.min(workerSource.length, start + 8000) : end);
}

export function pass(message) {
  console.log('✅ ' + message);
}

export function requireCheck(condition, message) {
  if (!condition) throw new Error('FALLO: ' + message);
  pass(message);
}
