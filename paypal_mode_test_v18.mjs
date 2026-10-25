import assert from 'node:assert/strict';
import { getPayPalMode } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';
import { productionConfig, requireCheck } from './repo-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const local = JSON.parse(readFileSync(new URL('./wrangler.jsonc', import.meta.url), 'utf8'));
const test = JSON.parse(readFileSync(new URL('./wrangler.test_v18.jsonc', import.meta.url), 'utf8'));

assert.equal(getPayPalMode({ PAYPAL_MODE: 'live' }), 'live');
assert.equal(getPayPalMode({ PAYPAL_MODE: 'sandbox' }), 'sandbox');
assert.throws(() => getPayPalMode({}), /PAYPAL_MODE debe configurarse explícitamente/);
assert.throws(() => getPayPalMode({ PAYPAL_MODE: 'typo' }), /PAYPAL_MODE debe configurarse explícitamente/);

requireCheck(productionConfig.vars.PAYPAL_MODE === 'live', 'Producción conserva el modo live explícito');
requireCheck(local.vars.PAYPAL_MODE === 'sandbox' && test.vars.PAYPAL_MODE === 'sandbox',
  'Las configuraciones locales se mantienen en sandbox');

console.log('✅ Pruebas de modo PayPal fail-closed superadas; no se ejecutó ningún pago.');
