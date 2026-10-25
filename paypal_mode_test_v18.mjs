import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPayPalMode } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

assert.equal(getPayPalMode({ PAYPAL_MODE: 'sandbox' }), 'sandbox');
assert.equal(getPayPalMode({ PAYPAL_MODE: 'live' }), 'live');
assert.equal(getPayPalMode({ PAYPAL_MODE: ' LIVE ' }), 'live');
for (const env of [{}, { PAYPAL_MODE: '' }, { PAYPAL_MODE: 'test' }, { PAYPAL_MODE: 'production' }]) {
  assert.throws(() => getPayPalMode(env), /PAYPAL_MODE debe configurarse explícitamente/, 'Un modo desconocido no puede habilitar pagos');
}
const source = await readFile(new URL('./OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const start = source.indexOf('function getPayPalApiUrl(env)');
assert.notEqual(start, -1);
const end = source.indexOf('\n}', start) + 2;
const fn = source.slice(start, end);
assert.ok(fn.includes('getPayPalMode(env) === \'sandbox\''));
assert.ok(fn.includes('https://api-m.sandbox.paypal.com'));
assert.ok(fn.includes('https://api-m.paypal.com'));
console.log('paypal_mode_test_v18: 8 comprobaciones superadas; no se hicieron pagos reales.');
