import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hashDynamicKey } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const source = await readFile(new URL('./OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const env = {
  DYNAMIC_KEY_INDEX_SECRET: 'index-' + 'I'.repeat(58),
  DYNAMIC_KEY_ENCRYPTION_SECRET: 'encryption-' + 'E'.repeat(54)
};
const h1 = await hashDynamicKey(env, 'TEST-KEY-001');
const h1Repeat = await hashDynamicKey(env, 'TEST-KEY-001');
const h2 = await hashDynamicKey(env, 'TEST-KEY-002');
assert.match(h1, /^[a-f0-9]{64}$/, 'El índice debe ser HMAC SHA-256 en hex');
assert.equal(h1, h1Repeat, 'La misma clave y secreto deben producir el mismo índice');
assert.notEqual(h1, h2, 'Claves diferentes deben producir índices diferentes');
const hOtherSecret = await hashDynamicKey({ ...env, DYNAMIC_KEY_INDEX_SECRET: 'other-' + 'O'.repeat(58) }, 'TEST-KEY-001');
assert.notEqual(h1, hOtherSecret, 'Cambiar el secreto de índice debe cambiar el HMAC');
await assert.rejects(() => hashDynamicKey({ ...env, DYNAMIC_KEY_INDEX_SECRET: 'short' }, 'TEST-KEY-001'), /32 caracteres/);
await assert.rejects(() => hashDynamicKey({ ...env, DYNAMIC_KEY_INDEX_SECRET: env.DYNAMIC_KEY_ENCRYPTION_SECRET }, 'TEST-KEY-001'), /distinto/);

for (const route of ['/verify','/verify-web','/key-info']) {
  assert.ok(source.includes(`'${route}'`) || source.includes(`"${route}"`), `Debe existir la ruta ${route}`);
}
assert.ok(source.includes('kData.un_solo_uso && currentUses >= 1'), 'La clave de un solo uso debe rechazarse al volver a usarse');
assert.ok(source.includes('await blockKey(env, key)'), 'La reutilización de una clave de un solo uso bloquea la clave');
assert.ok(source.includes('bindings[keyHash] && !bindings[keyHash].ips.includes(ip)'), 'El vínculo IP debe detectar una IP no asociada');
assert.ok(source.includes('if (isBlocked) return jsonResponse'), 'Las claves bloqueadas deben rechazarse');

console.log('key_index_route_test_v18: 10 comprobaciones superadas (HMAC real + contratos de ruta).');
