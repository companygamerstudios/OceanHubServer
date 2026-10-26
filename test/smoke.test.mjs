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

test('local development uses a separate Worker and PayPal sandbox', () => {
  assert.equal(local.name, 'oceanhub-local');
  assert.equal(local.vars.PAYPAL_MODE, 'sandbox');
  assert.equal(local.main, production.main);
  assert.notEqual(local.vars.BASE_URL, production.vars.BASE_URL);
});

test('production config declares required Worker secrets without requiring inactive external-backup encryption', () => {
  assert.equal(production.name, 'oceanhud');
  assert.equal(production.vars.PAYPAL_MODE, 'live');
  assert.ok(Array.isArray(production.secrets?.required));
  assert.ok(production.secrets.required.includes('STABLE_HORDE_API_KEY'));
  assert.equal(production.secrets.required.includes('BACKUP_ENCRYPTION_SECRET'), false);
  assert.match(source, /BACKUP_DISABLED_NO_EXTERNAL_STORAGE/);
});

test('sensitive SSE route is covered by the admin gate', () => {
  assert.match(source, /function adminProtectedPath\(path\)[\s\S]{0,500}['"]\/sse['"]/);
  assert.match(source, /if \(adminProtectedPath\(path\)\)[\s\S]{0,180}requireAdmin\(env, request\)/);
});

test('key verification and key info use POST request bodies', () => {
  assert.match(source, /async function handleVerifyWeb\(env, request\)[\s\S]{0,240}request\.method !== 'POST'/);
  assert.match(source, /async function handleKeyInfo\(env, request\)[\s\S]{0,240}request\.method !== 'POST'/);
  assert.match(source, /fetch\('\/verify-web',[\s\S]{0,220}method: 'POST'[\s\S]{0,180}body: JSON\.stringify\(\{ key \}\)/);
  assert.match(source, /async function handleKeyInfo\(env, request\)[\s\S]{0,600}request\.json\(\)/);
});

test('unused legacy main route has been removed', () => {
  assert.equal(source.includes('handleMainRoute'), false);
});

test('PIN throttling includes a hashed account key as well as the client IP', () => {
  assert.ok((source.match(/pin_fail_account_/g) || []).length >= 3);
  assert.match(source, /Demasiados intentos de PIN para esta cuenta o IP/);
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

test('home sidebar exposes the existing Friends page', () => {
  assert.ok(source.includes('<a class=\\\"nv\\\" href=\\\"/friends\\\">👥 Friends</a>'));
  assert.ok(source.includes("if (path === '/friends') return await handleFriendsPage(env, request);"));
});

test('Ocean Hub community pages and actions are wired into the Worker', () => {
  for (const route of ["'/friends/status'", "'/ocean-xp'", "'/feed'", "'/parties'", "'/crews'", "'/events'"]) {
    assert.ok(source.includes("path === " + route), 'Missing route ' + route);
  }
  assert.ok(source.includes("path === '/admin/community-reports'"));
  assert.ok(source.includes('async function handleCommunityStatusForm'));
  assert.ok(source.includes('async function handleFeedAction'));
  assert.ok(source.includes('async function handlePartyAction'));
  assert.ok(source.includes('async function handleCrewAction'));
  assert.ok(source.includes('async function handleEventAction'));
});

test('Community features enforce length limits, rate limits and authenticated ownership actions', () => {
  for (const marker of ['community-feed-create', 'community-feed-comment', 'community-party-create', 'community-crew-create', 'community-event-create']) {
    assert.ok(source.includes(marker), 'Missing rate limit ' + marker);
  }
  assert.ok(source.includes("if (post.author_email !== me.email.toLowerCase())"));
  assert.ok(source.includes('El anfitrión debe cerrar la party'));
  assert.ok(source.includes('Solo el fundador puede disolver esta crew'));
  assert.ok(source.includes('Solo el organizador puede cancelar el evento'));
  assert.ok(source.includes('Mi presencia'));
});

test('Air Flow keeps its existing capabilities and exposes Gaming Copilot as an additional mode', () => {
  for (const mode of ['QUICK', 'THINK', 'RESEARCH', 'CODE', 'STUDY', 'GAMING', 'CREATE', 'TRAVEL', 'PLANNER', 'AGENT', 'SHOPPING', 'SECURITY']) {
    assert.ok(source.includes(mode + ':'), 'Air Flow mode missing: ' + mode);
  }
  assert.ok(source.includes('Gaming Copilot'));
  assert.ok(source.includes("async function handleAirFlowChatV11"));
  assert.ok(source.includes("AF_MODE_RULES"));
});

test('Community content indexes retain newly created records for feed, parties, crews, events and reports', () => {
  for (const label of ['posts', 'parties', 'crews', 'events', 'reports']) {
    assert.ok(source.includes("'oh_community_index_" + label + "'") || source.includes("'oh_community_index_' + label"));
  }
  for (const prefix of ['oh_post_', 'oh_party_', 'oh_crew_', 'oh_event_', 'oh_report_']) {
    assert.ok(source.includes("communityIndexAdd(env, '" + prefix + "'"), 'Missing index write for ' + prefix);
  }
  assert.ok(source.includes('slice(0, 1000)'), 'Indexes must remain bounded');
});

test('Friends presence uses a rate-limited heartbeat and respects invisible mode', () => {
  assert.ok(source.includes("path === '/friends/presence'"));
  assert.ok(source.includes('community-presence-heartbeat'));
  assert.ok(source.includes("setInterval(function(){fetch('/friends/presence'"));
  assert.ok(source.includes("status.status === 'invisible'"));
});
