import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { getPayPalMode } from '../OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const source = await readFile(new URL('../OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const production = JSON.parse(await readFile(new URL('../wrangler.production_v18.jsonc', import.meta.url), 'utf8'));
const inventory = JSON.parse(await readFile(new URL('../required-secrets.production.json', import.meta.url), 'utf8'));
const local = JSON.parse(await readFile(new URL('../wrangler.local.jsonc', import.meta.url), 'utf8'));

test('PayPal mode accepts only explicit sandbox/live values', () => {
  assert.equal(getPayPalMode({ PAYPAL_MODE: 'sandbox' }), 'sandbox');
  assert.equal(getPayPalMode({ PAYPAL_MODE: 'LIVE' }), 'live');
  for (const env of [{}, { PAYPAL_MODE: '' }, { PAYPAL_MODE: 'test' }, { PAYPAL_MODE: 'production' }]) {
    assert.throws(() => getPayPalMode(env), /PAYPAL_MODE/);
  }
});

test('local development uses a separate Worker and PayPal sandbox', () => {
  assert.equal(local.name, 'oceanhub-local');
  assert.equal(local.vars.PAYPAL_MODE, 'sandbox');
  assert.equal(local.main, production.main);
  assert.notEqual(local.vars.BASE_URL, production.vars.BASE_URL);
});

test('production deployment config contains no non-standard secrets field', () => {
  assert.equal(production.name, 'oceanhud');
  assert.equal(production.vars.PAYPAL_MODE, 'live');
  assert.equal(Object.hasOwn(production, 'secrets'), false);
  assert.ok(inventory.required.includes('STABLE_HORDE_API_KEY'));
});

test('sensitive SSE route is covered by the admin gate', () => {
  assert.match(source, /function adminProtectedPath\(path\)[\s\S]{0,500}['"]\/sse['"]/);
  assert.match(source, /if \(adminProtectedPath\(path\)\)[\s\S]{0,180}requireAdmin\(env, request\)/);
});

test('key verification and key info use POST request bodies', () => {
  assert.match(source, /async function handleVerifyWeb\(env, request\)[\s\S]{0,240}request\.method !== 'POST'/);
  assert.match(source, /async function handleKeyInfo\(env, request\)[\s\S]{0,240}request\.method !== 'POST'/);
  assert.match(source, /fetch\('\/verify-web',[\s\S]{0,220}method: 'POST'[\s\S]{0,180}body: JSON\.stringify\(\{ key \}\)/);
  assert.match(source, /fetch\('\/key-info',[\s\S]{0,220}method: 'POST'[\s\S]{0,180}body: JSON\.stringify\(\{ key \}\)/);
});

test('random ID suffixes use 16 random bytes', () => {
  assert.equal((source.match(/generateRandomHex\(16\)/g) || []).length >= 3, true);
  assert.equal(source.includes('generateRandomHex(4)'), false);
});

test('baseline security headers include HSTS', async () => {
  const response = await (await import('../OceanHub_SECURITY_PATCHED_FINAL_v18.js')).applySecurityHeaders(new Response('ok'));
  assert.match(response.headers.get('Strict-Transport-Security') || '', /max-age=31536000/);
});

test('webhook test endpoint is disabled unless explicitly enabled', () => {
  assert.match(source, /async function handleWebhookTest\(env\)[\s\S]{0,250}ALLOW_WEBHOOK_TEST/);
  assert.match(source, /Endpoint de prueba desactivado/);
});

test('alert text redacts embedded email addresses', () => {
  assert.ok(source.includes('email => maskAlertValue(email)'));
});

test('uploads enforce size and MIME controls', () => {
  assert.match(source, /El CSV supera el límite de 2 MB/);
  assert.match(source, /10 000 líneas/);
  assert.match(source, /AF_ALLOWED_IMAGE_MIME/);
  assert.match(source, /AF_ALLOWED_FILE_MIME/);
});

test('Air Flow and privacy policy disclose AI processor sharing', () => {
  assert.match(source, /Tus prompts, contexto y archivos pueden enviarse a Gemini, OpenRouter o Stable Horde/);
  assert.match(source, /Google Gemini, OpenRouter o Stable Horde para generar una respuesta o imagen/);
});

test('worker fails closed when the required Durable Object binding is absent', async () => {
  const response = await worker.fetch(new Request('https://example.test/'), {});
  assert.equal(response.status, 503);
  assert.match(await response.text(), /KV_LOCKER_NOT_CONFIGURED/);
});
