import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const start = source.indexOf("if (provider === 'stablehorde')");
assert.notEqual(start, -1, 'Debe existir el proveedor Stable Horde');
const end = source.indexOf("\n    if (provider === 'openrouter')", start);
assert.notEqual(end, -1, 'Debe existir el límite del bloque Stable Horde');
const horde = source.slice(start, end);
assert.ok(horde.includes('env.STABLE_HORDE_API_KEY'), 'La API key debe leerse del Secret de entorno');
assert.ok(horde.includes("'apikey': apiKey"), 'La clave se envía en el header documentado, no en la URL');
assert.ok(horde.includes('https://stablehorde.net/api/v2/generate/async'), 'Debe encolar el trabajo en el endpoint async');
assert.ok(horde.includes('nsfw: false') && horde.includes('censor_nsfw: true'), 'Debe mantener restricciones NSFW');
assert.ok(source.includes('https://stablehorde.net/api/v2/generate/check/') && source.includes('https://stablehorde.net/api/v2/generate/status/'), 'Debe consultar el estado de la cola por separado');
assert.ok(source.includes('async function afImageRateLimit'), 'Las generaciones deben llevar un límite propio');
assert.ok(!/STABLE_HORDE_API_KEY\s*[:=]\s*['"][^'"]+['"]/.test(source), 'No debe haber una API key literal incrustada');
console.log('stable_horde_test_v18: 7 comprobaciones de integración superadas; no se hicieron llamadas a Stable Horde.');
