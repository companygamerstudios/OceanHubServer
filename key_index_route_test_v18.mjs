import assert from 'node:assert/strict';
import { hashDynamicKey } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const encryption = 'test-only-encryption-secret-0123456789abcdef0123456789abcdef';
const index = 'test-only-index-secret-fedcba9876543210fedcba9876543210';
const env = { DYNAMIC_KEY_ENCRYPTION_SECRET: encryption, DYNAMIC_KEY_INDEX_SECRET: index };
const first = await hashDynamicKey(env, 'TEST-KEY-123');
const again = await hashDynamicKey(env, 'TEST-KEY-123');
const other = await hashDynamicKey(env, 'TEST-KEY-124');

assert.equal(first, again, 'La indexación debe ser determinista para el mismo secreto y clave.');
assert.match(first, /^[a-f0-9]{64}$/);
assert.notEqual(first, other, 'Dos claves diferentes no deben compartir el índice HMAC en esta prueba.');
await assert.rejects(() => hashDynamicKey({ ...env, DYNAMIC_KEY_INDEX_SECRET: 'short' }, 'TEST-KEY-123'),
  /DYNAMIC_KEY_INDEX_SECRET/);
await assert.rejects(() => hashDynamicKey({
  DYNAMIC_KEY_ENCRYPTION_SECRET: encryption,
  DYNAMIC_KEY_INDEX_SECRET: encryption
}, 'TEST-KEY-123'), /debe ser distinto/);
const changedSecret = await hashDynamicKey({
  DYNAMIC_KEY_ENCRYPTION_SECRET: encryption,
  DYNAMIC_KEY_INDEX_SECRET: 'test-only-other-index-secret-123456789012345678901234567890'
}, 'TEST-KEY-123');
assert.notEqual(first, changedSecret, 'Rotar el secreto de índice cambia los hashes.');

console.log('PASS key_index: HMAC SHA-256 determinista, claves distintas, longitud segura y secreto independiente.');
