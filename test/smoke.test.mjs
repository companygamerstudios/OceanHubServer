import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { getPayPalMode } from '../OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const source = await readFile(new URL('../OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const production = JSON.parse(await readFile(new URL('../wrangler.production_v18.jsonc', import.meta.url), 'utf8'));
const local = JSON.parse(await readFile(new URL('../wrangler.local.jsonc', import.meta.url), 'utf8'));

test('PayPal mode accepts only explicit sandbox/live values', () => {
  assert.equal(getPayPalMode({ PAYPAL_MODE: 'sandbox' }), 'sandbox');
  assert.equal(getPayPalMode({ PAYPAL_MODE: 'LIVE' }), 'live');
  for (const env of [{}, { PAYPAL_MODE: '' }, { PAYPAL_MODE: 'test' }, { PAYPAL_MODE: 'production' }]) {
    assert.throws(() => getPayPalMode(env), /PAYPAL_MODE/);
  }
});

test('local development cannot accidentally use live PayPal', () => {
  assert.equal(local.name, 'oceanhub-local');
  assert.equal(local.vars.PAYPAL_MODE, 'sandbox');
  assert.equal(local.main, production.main);
  assert.notEqual(local.vars.BASE_URL, production.vars.BASE_URL);
});

test('production payment mode is explicitly configured, not inferred', () => {
  assert.equal(production.name, 'oceanhud');
  assert.equal(production.vars.PAYPAL_MODE, 'live');
  assert.ok(production.secrets?.required?.length > 0);
  assert.ok(production.secrets.required.every((name) => /^[A-Z][A-Z0-9_]+$/.test(name)));
});

test('production image generation explicitly uses Stable Horde and requires its API secret', () => {
  assert.equal(production.vars.AF_IMAGE_PROVIDER, 'stablehorde');
  assert.ok(production.secrets.required.includes('STABLE_HORDE_API_KEY'));
  assert.match(source, /env\.STABLE_HORDE_API_KEY/);
});

test('session cookie and baseline response security headers remain present', () => {
  assert.match(source, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(source, /Content-Security-Policy/);
  assert.match(source, /X-Content-Type-Options/);
  assert.match(source, /Referrer-Policy/);
  assert.match(source, /X-Frame-Options/);
});

test('worker fails closed when the required Durable Object binding is absent', async () => {
  const response = await worker.fetch(new Request('https://example.test/'), {});
  assert.equal(response.status, 503);
  assert.match(await response.text(), /KV_LOCKER_NOT_CONFIGURED/);
});
