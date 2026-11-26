import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import worker, { getPayPalMode, safeCsvCell, KVLocker, encryptBackupPayload, decryptBackupPayload, afParseCsvRecords } from '../OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const source = await readFile(new URL('../OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const production = JSON.parse(await readFile(new URL('../wrangler.production_v18.jsonc', import.meta.url), 'utf8'));
const local = JSON.parse(await readFile(new URL('../wrangler.local.jsonc', import.meta.url), 'utf8'));
const nativeWorkflow = await readFile(new URL('../.github/workflows/oceanhub-native-validation.yml', import.meta.url), 'utf8');
const deployWorkflow = await readFile(new URL('../.github/workflows/deploy-production.yml', import.meta.url), 'utf8');

test('native build CI creates and validates only a directly downloadable Android APK', () => {
  assert.ok(nativeWorkflow.includes('Configure Maven repositories for Android Gradle and buildSrc'));
  assert.ok(nativeWorkflow.includes('mavenCentral()'));
  assert.ok(nativeWorkflow.includes('google()'));
  assert.ok(nativeWorkflow.includes("const marker = 'pluginManagement {'"));
  assert.ok(nativeWorkflow.includes("const repoMarker = 'repositories {';"));
  assert.ok(nativeWorkflow.includes('const remainder = source.slice(0, start) + source.slice(close + 1);'));
  assert.ok(nativeWorkflow.includes('Gradle requires pluginManagement before all executable settings statements.'));
  assert.ok(nativeWorkflow.includes('src-tauri/gen/android/buildSrc/settings.gradle.kts'));
  assert.ok(nativeWorkflow.includes('Build installable Android arm64 APK'));
  assert.ok(nativeWorkflow.includes("com.companygamerstudios.oceanhub"));
  assert.ok(nativeWorkflow.includes("application-label:'OceanHub'"));
  assert.ok(nativeWorkflow.includes('launchable-activity'));
  assert.ok(nativeWorkflow.includes('application-icon-[0-9]+:'));
  assert.ok(nativeWorkflow.includes('actions/upload-artifact@v7'));
  assert.ok(nativeWorkflow.includes('archive: false'));
  assert.ok(nativeWorkflow.includes('OceanHub-Android-arm64-preview.apk'));
  assert.equal(nativeWorkflow.includes('windows-test-installers'), false);
  assert.equal(nativeWorkflow.includes('--bundles nsis'), false);
});

test('production deployment requires an explicit manual dispatch from main', () => {
  assert.ok(deployWorkflow.includes('workflow_dispatch:'));
  assert.equal(deployWorkflow.includes('  push:'), false);
  assert.ok(deployWorkflow.includes('refs/heads/main'));
  assert.ok(deployWorkflow.includes('El despliegue de producción solo se permite desde main.'));
  assert.ok(deployWorkflow.includes('actions/checkout@v7'));
  assert.ok(deployWorkflow.includes('actions/setup-node@v7'));
  assert.ok(deployWorkflow.includes('npx wrangler deploy --config wrangler.production_v18.jsonc'));
});

test('Cloudflare Workers Builds cannot deploy production from a non-main branch', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const preflight = fileURLToPath(new URL('../preflight_deploy_v18.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [preflight, 'production'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      WORKERS_CI: '1',
      WORKERS_CI_BRANCH: 'feat/test-preview'
    }
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Despliegue de producción bloqueado/);
  assert.match(result.stderr, /feat\/test-preview/);
});

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
  assert.match(source, /BACKUPS_R2_NOT_CONFIGURED/);
  assert.match(source, /BACKUP_ENCRYPTION_SECRET/);
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
  assert.ok(source.includes("function beat(){if(document.hidden)return;fetch('/friends/presence'"));
  assert.ok(source.includes("status.status === 'invisible'"));
});


test('the admin dashboard links to the unified OceanHub Verified center', () => {
  assert.match(source, /const verificationPanelLink = .*href="\/admin\/ocean-verifications"/);
  assert.match(source, /\$\{verificationPanelLink\}/);
  assert.ok(source.includes("path === '/admin/social' || path === '/admin/verificacion' || path === '/admin/verification-requests'"));
  assert.ok(source.includes("new URL('/admin/ocean-verifications', request.url)"));
  assert.ok(source.includes("if (path === '/admin/verify-user') return await handleAdminVerifyUser(env, request);"));
  assert.match(source, /async function handleAdminVerifyUser\(env, request\)[\s\S]{0,600}410/);
});

test('legacy verification URLs converge on OceanHub Verified while audit data remains archived', () => {
  assert.ok(source.includes("if (path === '/verification/request') {"));
  assert.ok(source.includes("new URL('/ocean/verified', request.url)"));
  assert.ok(source.includes("if (request.method !== 'GET' && request.method !== 'HEAD')"));
  assert.ok(source.includes("if (path === '/admin/verification-audit') return await handleAdminVerificationAuditPage(env, request);"));
  assert.ok(source.includes('async function handleVerificationRequestPage'));
  assert.ok(source.includes('async function handleAdminVerificationRequestsPage'));
  assert.ok(source.includes("source: 'user-request'"));
  assert.ok(source.includes('decision_reason'));
});

test('Ocean Identity exposes bounded profile tagline, favorite game and safe creator URL fields', () => {
  assert.ok(source.includes('favorite_game'));
  assert.ok(source.includes('creator_link'));
  assert.ok(source.includes("if (body.tagline !== undefined)"));
  assert.ok(source.includes('El enlace del creador debe empezar por https:// o http://'));
});

test('Ocean Seasons awards idempotent seasonal XP without removing lifetime XP', () => {
  assert.ok(source.includes('function communityCurrentSeason'));
  assert.ok(source.includes('oh_season_'));
  assert.ok(source.includes("const stateKey = 'oh_xp_'"));
  assert.ok(source.includes('Nivel de temporada'));
});

test('Game Party supports private rooms and invitation-only joining', () => {
  assert.ok(source.includes('invited_emails'));
  assert.ok(source.includes('is_private: isPrivate'));
  assert.ok(source.includes('Esta party es privada: necesitas una invitación del anfitrión.'));
  assert.ok(source.includes('async function handlePartyInvite'));
  assert.ok(source.includes("action=\"/parties/' + p.id + '/invite\""));
});

test('Creator Studio, Ocean Arena and Air Flow Studio are routed and retain owner/access checks', () => {
  assert.ok(source.includes("if (path === '/creator-studio')"));
  assert.ok(source.includes('async function handleCreatorStudioPage'));
  assert.ok(source.includes("if (path === '/arena')"));
  assert.ok(source.includes('async function handleArenaAction'));
  assert.ok(source.includes('Solo el organizador puede cancelar el torneo.'));
  assert.ok(source.includes("if (path === '/air-flow-studio')"));
  assert.ok(source.includes('async function handleAirFlowStudioPage'));
  assert.ok(source.includes("href=\"/air-flow\""));
});

test('Air Flow Studio is an add-on and does not remove the existing Air Flow chat engine or modes', () => {
  assert.ok(source.includes('async function handleAirFlowChatV11'));
  assert.ok(source.includes('AF_MODE_RULES'));
  assert.ok(source.includes("if (path === '/air-flow-studio')"));
  for (const mode of ['QUICK', 'THINK', 'RESEARCH', 'CODE', 'STUDY', 'GAMING', 'CREATE', 'TRAVEL', 'PLANNER', 'AGENT', 'SHOPPING', 'SECURITY']) {
    assert.ok(source.includes(mode + ':'), 'Air Flow mode missing: ' + mode);
  }
});


test('Private Game Party invitations are rate-limited, bounded and limited to the host', () => {
  assert.ok(source.includes("checkActionRateLimit(env, 'community-party-invite', me.email, 20, 3600)"));
  assert.ok(source.includes('party.invited_emails.length >= 50'));
  assert.ok(source.includes('Solo el anfitrión puede invitar a una party activa.'));
  assert.ok(source.includes('Esta party es privada: necesitas una invitación del anfitrión.'));
});


test('OceanHub Sellers creates stable seller IDs, public usernames and graduated ranks', () => {
  assert.match(source, /const OCEAN_SELLER_RANKS = Object\.freeze\(/);
  assert.match(source, /async function ensureOceanSellerIdentity\(/);
  assert.match(source, /function getOceanSellerRank\(reseller\)/);
  for (const rank of ['Ocean Starter', 'Ocean Growth', 'Ocean Pro', 'Ocean Elite', 'Ocean Legend']) {
    assert.ok(source.includes(rank), 'Missing seller rank: ' + rank);
  }
  assert.match(source, /seller_id = 'OH-' \+ generateRandomHex\(16\)\.slice\(0, 8\)/);
});

test('OceanHub Sellers has an admin-gated visual console and a safe summary route', () => {
  assert.match(source, /async function handleAdminSellersPage\(env, request\)[\s\S]{0,180}requireAdmin\(env, request\)/);
  assert.match(source, /async function handleListSellerSummaries\(env, request\)[\s\S]{0,180}requireAdmin\(env, request\)/);
  assert.ok(source.includes("path === '/admin/sellers'"));
  assert.ok(source.includes("path === '/admin/resellers/summary'"));
  assert.ok(source.includes("href=\"/admin/sellers\""));
  assert.ok(source.includes("fetch('/admin/resellers/summary'"));
});

test('OceanHub Staff and OceanHub Sellers remain separate account roles', () => {
  assert.match(source, /user\.role === 'admin'\) return jsonResponse\(\{ error: 'Las cuentas de OceanHub Staff/);
  assert.match(source, /requestedPercent < 0 \|\| requestedPercent > 100/);
  assert.match(source, /if \(user\.role !== 'reseller' \|\| !resellerRecord/);
  assert.ok(source.includes('OceanHub Staff · Admin'));
  assert.ok(source.includes('OceanHub Sellers · Vendedor'));
});


test('Friends presence fallback reads the correct heartbeat and never discloses invisible mode', () => {
  assert.ok(source.includes("else isOnline = !!(await env.STATS.get(await communityPresenceKey(publicFriend.email)));"));
  assert.equal(source.includes("else isOnline = !!(await env.STATS.get(await communityPresenceKey(env, publicFriend.email)));"), false);
  assert.ok(source.includes("if (status.status === 'invisible') isOnline = false;"));
  assert.ok(source.includes("const visibleStatus = isOnline ? status.status : 'offline';"));
  assert.ok(source.includes("status: visibleStatus,"));
});

test('Friends now uses low-latency presence snapshots and refreshes without reloading the page', () => {
  assert.ok(source.includes("url.pathname === '/realtime/presence/batch'"));
  assert.ok(source.includes("communityRealtimeCall(env, '/realtime/presence/batch'"));
  assert.ok(source.includes("path === '/friends/presence'"));
  assert.ok(source.includes("setInterval(refreshPresence,10000)"));
  assert.ok(source.includes("status_label: isOnline ?"));
  assert.ok(source.includes("communityRemovePresence(env, me.email)"));
});

test('private chat shows each sender avatar and name, and typing state uses the Durable Object', () => {
  assert.ok(source.includes('class="message-avatar"'));
  assert.ok(source.includes('class="message-author"'));
  assert.ok(source.includes('id="typingIndicator"'));
  assert.ok(source.includes("async function handleDmTypingApi"));
  assert.ok(source.includes("url.pathname === '/realtime/typing/set'"));
  assert.ok(source.includes("url.pathname === '/realtime/typing/get'"));
  assert.ok(source.includes("setInterval(refreshTyping,2500)"));
  assert.ok(source.includes("setInterval(function(){load().catch(function(){})},5000)"));
  assert.ok(source.includes("socialShell('Chat con ' + pub.name"));
  assert.ok(source.includes("function beat(){if(document.hidden)return;fetch('/friends/presence'"));
});

test('Worker Previews bind their own Durable Object namespace without reusing production KV', () => {
  assert.deepEqual(production.previews?.durable_objects?.bindings, [
    { name: 'KV_LOCKER', class_name: 'KVLocker' }
  ]);
  const previewKv = production.previews?.kv_namespaces || [];
  assert.equal(previewKv.some(binding => binding.binding === 'STATS'), false);
  assert.equal(
    previewKv.some(binding => binding.id === production.kv_namespaces[0]?.id),
    false,
    'A Preview must never reuse the production STATS namespace.'
  );
});

test('CSV export quotes cells and neutralizes spreadsheet formulas', () => {
  assert.equal(safeCsvCell('normal,comma'), '"normal,comma"');
  assert.equal(safeCsvCell('say "hello"'), '"say ""hello"""');
  assert.equal(safeCsvCell('=1+1'), '"\'=1+1"');
  assert.equal(safeCsvCell('  +cmd'), '"\'  +cmd"');
  assert.equal(safeCsvCell(null), '""');
});

function createNonceLocker() {
  const values = new Map();
  const storage = {
    kv: {
      get(key) { return values.get(key); },
      put(key, value) { values.set(key, value); },
      delete(key) { values.delete(key); }
    },
    transactionSync(callback) { return callback(); }
  };
  return new KVLocker({ storage });
}

test('Durable Object Nonce consumption is atomic and permits only one concurrent winner', async () => {
  const locker = createNonceLocker();
  const nonce = 'A'.repeat(32);
  const ipHash = 'a'.repeat(64);
  const issued = await locker.fetch(new Request('https://kv-lock/security/nonce/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce, ipHash, ttl: 120 })
  }));
  assert.equal(issued.status, 201);

  const attempts = await Promise.all(Array.from({ length: 12 }, () =>
    locker.fetch(new Request('https://kv-lock/security/nonce/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonce, ipHash })
    }))
  ));
  const outcomes = await Promise.all(attempts.map(response => response.json()));
  assert.equal(outcomes.filter(result => result.ok === true).length, 1);
});

test('Durable Object Nonce is bound to IP hash without letting a wrong IP consume it', async () => {
  const locker = createNonceLocker();
  const nonce = 'B'.repeat(32);
  const ipHash = 'b'.repeat(64);
  const issued = await locker.fetch(new Request('https://kv-lock/security/nonce/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce, ipHash, ttl: 120 })
  }));
  assert.equal(issued.status, 201);

  const denied = await locker.fetch(new Request('https://kv-lock/security/nonce/consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce, ipHash: 'c'.repeat(64) })
  }));
  assert.deepEqual(await denied.json(), { ok: false });

  const accepted = await locker.fetch(new Request('https://kv-lock/security/nonce/consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce, ipHash })
  }));
  assert.deepEqual(await accepted.json(), { ok: true });
});

test('security and account-data routes keep existing client contracts while tightening mutations', () => {
  assert.match(source, /path === '\/verify-web'/);
  assert.match(source, /path === '\/get-nonce'/);
  assert.match(source, /path === '\/account\/export'/);
  assert.match(source, /path === '\/shop\/create-checkout'[\s\S]{0,250}request\.method !== 'POST'/);
  assert.match(source, /path === '\/cancelar-renovacion'[\s\S]{0,180}request\.method !== 'POST'/);
  assert.match(source, /Por seguridad, canjea el código mediante POST/);
  assert.match(source, /codigo = String\(payload\?\.codigo \|\| ''\)\.trim\(\)/);
  assert.equal(source.includes('<form method="POST" action="/claim-key">'), true);
  assert.match(source, /paypal_event_/);
  assert.match(source, /Content-Security-Policy-Report-Only/);
});

test('OAuth state is consumed under a distributed lock to reject parallel callbacks', () => {
  assert.ok(source.includes('async function consumeOAuthState'));
  assert.ok(source.includes('withKVLock(env, `oauth-state:'));
  assert.ok(source.includes('await env.STATS.delete(storageKey)'));
});

test('account export excludes password hashes, salts, TOTP seeds and session versions', () => {
  assert.ok(source.includes('async function handleAccountExport'));
  assert.ok(source.includes("'passwordHash'"));
  assert.ok(source.includes("'otp_secret'"));
  assert.ok(source.includes("'sessionVersion'"));
  assert.ok(source.includes("path === '/account/export'"));
});

test('backup encryption round-trips with an independent AES-256-GCM secret', async () => {
  const env = {
    BACKUP_ENCRYPTION_SECRET: 'backup-secret-for-tests-only-0123456789',
    DYNAMIC_KEY_ENCRYPTION_SECRET: 'data-encryption-secret-for-tests-only-0123456789',
    DYNAMIC_KEY_INDEX_SECRET: 'key-index-secret-for-tests-only-0123456789'
  };
  const payload = JSON.stringify({ format: 'OceanHubKVBackup', version: 1, entries: [{ name: 'test', value: 'value' }] });
  const encrypted = await encryptBackupPayload(env, payload);
  const parsed = JSON.parse(encrypted);
  assert.equal(parsed.algorithm, 'AES-256-GCM');
  assert.notEqual(parsed.ciphertext, payload);
  assert.equal(await decryptBackupPayload(env, encrypted), payload);
  await assert.rejects(
    decryptBackupPayload({ ...env, BACKUP_ENCRYPTION_SECRET: 'another-secret-for-tests-only-987654321' }, encrypted)
  );
});


test('Air Flow adds authenticated multimodal audio, video and data endpoints', () => {
  for (const route of [
    "'/air-flow/api/audio/transcribe'",
    "'/air-flow/api/audio/speech'",
    "'/air-flow/api/video/analyze'",
    "'/air-flow/api/data/analyze'",
    "'/air-flow/api/agent/tasks'"
  ]) assert.ok(source.includes(route), 'Missing Air Flow endpoint ' + route);
  for (const handler of ['handleAirFlowAudioTranscribeV1','handleAirFlowSpeechV1','handleAirFlowVideoAnalyzeV1','handleAirFlowDataAnalyzeV1','handleAirFlowAgentTasksV1']) assert.ok(source.includes(handler));
  assert.ok(source.includes('stopLive();'));
});

test('Workers AI binding is present in local and production Wrangler configs', () => {
  assert.deepEqual(production.ai, { binding: 'AI' });
  assert.deepEqual(local.ai, { binding: 'AI' });
  assert.deepEqual(production.previews.ai, { binding: 'AI' });
  assert.ok(source.includes("env.AI.run('@cf/openai/whisper-large-v3-turbo'"));
  assert.ok(source.includes("env.AI.run('@cf/deepgram/aura-2-es'"));
});

test('Air Flow CSV parser handles quoted commas, escaped quotes and CRLF rows', () => {
  const csv = ['name,description,value', 'Ocean,"blue, deep",12', 'Studio,"said ""hello""",18'].join(String.fromCharCode(13, 10));
  const rows = afParseCsvRecords(csv);
  assert.deepEqual(rows, [['name','description','value'],['Ocean','blue, deep','12'],['Studio','said "hello"','18']]);
});

test('Air Flow CSV parser rejects unclosed quotes and excessive rows', () => {
  assert.throws(() => afParseCsvRecords('a,b' + String.fromCharCode(10) + '1,"broken'), /CSV_UNCLOSED_QUOTE/);
  const manyRows = 'a' + String.fromCharCode(10) + Array.from({ length: 10002 }, () => '1').join(String.fromCharCode(10));
  assert.throws(() => afParseCsvRecords(manyRows), /CSV_ROW_LIMIT/);
});

test('Air Flow Agent task mutations use a per-account distributed lock and re-read KV state', () => {
  const start = source.indexOf('async function handleAirFlowAgentTasksV1(env, request) {');
  const end = source.indexOf('async function handleAirFlowFileDeleteV1', start);
  assert.ok(start >= 0 && end > start, 'Agent task handler must exist');
  const handler = source.slice(start, end);

  // Every write path must serialize its read/validate/write transition.
  assert.match(handler, /withKVLock\(env, lockName, async \(\) => \{[\s\S]{0,240}const tasks = await env\.STATS\.get\(key, 'json'\)/);
  assert.match(handler, /if \(request\.method === 'DELETE'\)[\s\S]{0,1000}withKVLock\(env, lockName/);
  assert.match(handler, /if \(action === 'create'\)[\s\S]{0,1800}withKVLock\(env, lockName/);
  assert.match(handler, /const claim = await withKVLock\(env, lockName, async \(\) => \{[\s\S]{0,500}task\.status !== 'planned'[\s\S]{0,500}status: 'running'/);

  // The potentially slow agent execution must happen after the claim lock is released.
  const claimEnd = handler.indexOf('// The distributed lock is deliberately released');
  const delegated = handler.indexOf('await handleAirFlowAgentV11(env, delegatedRequest)', claimEnd);
  assert.ok(claimEnd > 0 && delegated > claimEnd, 'Agent execution must occur outside the KV lock');

  // Completion/failure may only replace a still-running record, using a fresh read.
  assert.match(handler, /await withKVLock\(env, lockName, async \(\) => \{[\s\S]{0,180}const tasks = await env\.STATS\.get\(key, 'json'\)[\s\S]{0,180}current\.status !== 'running'/);
  assert.match(handler, /if \(!current \|\| current\.status !== 'running'\) return/);
  assert.match(handler, /task claim lock failed/);
  assert.match(handler, /task create lock failed/);
  assert.match(handler, /task cancellation lock failed/);
});

test('Air Flow exposes persistent task and private-file deletion capabilities', () => {
  assert.ok(source.includes('af_agent_tasks_'));
  assert.ok(source.includes('Solo puedes cancelar tareas que todavía no se han ejecutado'));
  assert.ok(source.includes('handleAirFlowFileDeleteV1'));
});
test('backup snapshots exclude short-lived credentials and rate-limit state', () => {
  for (const prefix of ['2fa_temp_', 'pwd_reset_', 'email_verify_', 'rl_ip_', 'rl_key_', 'rl_action_']) {
    assert.ok(source.includes(`'${prefix}'`), `backup must exclude ${prefix}`);
  }
});

test('backup restore remains opt-in, encrypted, R2-backed and additive only', () => {
  assert.match(source, /BACKUPS_R2_NOT_CONFIGURED/);
  assert.match(source, /encryptBackupPayload\(env, JSON\.stringify\(snapshot\)\)/);
  assert.match(source, /RESTORE_OCEANHUB_ADD_ONLY/);
  assert.match(source, /mode: 'additive'/);
  assert.match(source, /never deletes|nunca borra/i);
});

