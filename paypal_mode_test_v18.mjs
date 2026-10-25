import assert from 'node:assert/strict';
import { getPayPalMode } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

assert.equal(getPayPalMode({ PAYPAL_MODE: 'sandbox' }), 'sandbox');
assert.equal(getPayPalMode({ PAYPAL_MODE: 'live' }), 'live');
assert.equal(getPayPalMode({ PAYPAL_MODE: ' SANDBOX ' }), 'sandbox');
for (const env of [{}, { PAYPAL_MODE: '' }, { PAYPAL_MODE: 'test' }, { PAYPAL_MODE: 'production' }]) {
  assert.throws(() => getPayPalMode(env), /PAYPAL_MODE/);
}

console.log('PASS paypal_mode: Sandbox/Live explícitos; valores ausentes o inválidos fallan de forma cerrada.');
