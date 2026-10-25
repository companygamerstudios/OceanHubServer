import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const start = source.indexOf('async function handleEmailVerification(env, request)');
assert.ok(start >= 0, 'No se encontró el handler de verificación de email.');
const end = source.indexOf('\nasync function ', start + 10);
const handler = source.slice(start, end > start ? end : undefined);

assert.match(source, /const EMAIL_VERIFICATION_TTL = 86400/);
assert.match(source, /generateRandomHex\(32\)/);
assert.match(source, /email_verify_current_\$\{email\}/);
assert.match(handler, /!\/\^\[a-f0-9\]\{64\}\$\/i\.test\(token\)/);
assert.match(handler, /request\.method === 'GET'/);
assert.match(handler, /request\.method !== 'POST'/);
assert.match(handler, /withKVLock\(env, `email-verify:\$\{email\}`/);
assert.match(handler, /await env\.STATS\.delete\(`email_verify_\$\{token\}`\)/);
assert.match(handler, /await env\.STATS\.delete\(`email_verify_current_\$\{email\}`\)/);
assert.match(handler, /checkActionRateLimit\(env, 'email-verify'/);
assert.match(handler, /password\.length < 8/);
assert.match(handler, /password !== password2/);

console.log('PASS email_verification_flow: el código conserva tokens de 64 hex, caducidad de 24 h, control de token vigente, límite de intentos y consumo de un solo uso.');
console.log('LIMIT: es una prueba estructural del flujo; no envía emails ni crea usuarios en un entorno real.');
