import assert from 'node:assert/strict';
import { hashDynamicKey } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';
import { workerSource as source, requireCheck } from './repo-audit-helpers.mjs';

const env = {
  DYNAMIC_KEY_ENCRYPTION_SECRET: 'e'.repeat(64),
  DYNAMIC_KEY_INDEX_SECRET: 'f'.repeat(64)
};
const first = await hashDynamicKey(env, 'TEST-DYNAMIC-KEY-ONE');
const repeated = await hashDynamicKey(env, 'TEST-DYNAMIC-KEY-ONE');
const second = await hashDynamicKey(env, 'TEST-DYNAMIC-KEY-TWO');

assert.equal(first, repeated, 'El índice de una clave debe ser determinista');
assert.notEqual(first, second, 'Claves distintas deben obtener índices distintos');
assert.match(first, /^[a-f0-9]{64}$/i, 'El índice HMAC debe tener formato hexadecimal SHA-256');
await assert.rejects(
  hashDynamicKey({ ...env, DYNAMIC_KEY_INDEX_SECRET: env.DYNAMIC_KEY_ENCRYPTION_SECRET }, 'TEST'),
  /debe ser distinto/,
  'El secreto índice debe diferir del secreto de cifrado'
);
await assert.rejects(
  hashDynamicKey({ ...env, DYNAMIC_KEY_INDEX_SECRET: 'short' }, 'TEST'),
  /demasiado corto/,
  'El secreto índice debe tener longitud suficiente'
);

requireCheck(source.includes('async function handleVerify(env, request)'), 'Existe el endpoint de verificación HMAC');
requireCheck(source.includes("const timestamp = String(body?.timestamp || '')") &&
  source.includes("const nonce = String(body?.nonce || '')") &&
  source.includes("const hmac = String(body?.hmac || '')"),
  'El endpoint exige timestamp, nonce y firma');
requireCheck(source.includes('Math.abs(now - ts) > 120'), 'La firma rechaza timestamps fuera de ventana');
requireCheck(source.includes('async function handleKeyInfo(env, request)'), 'Existe el endpoint de información de claves');
requireCheck(source.includes('const dynamicHash = await hashDynamicKey(env, key)'),
  'El lookup de claves dinámicas usa el índice HMAC');

console.log('✅ Pruebas de HMAC y chequeos de rutas de claves superados.');
