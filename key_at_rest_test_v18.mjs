import assert from 'node:assert/strict';
import { encryptAtRestValue, decryptAtRestValue } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const env = { DYNAMIC_KEY_ENCRYPTION_SECRET: 'test-only-encryption-secret-0123456789abcdef0123456789abcdef' };
const plain = JSON.stringify({ key: 'DO_NOT_STORE_THIS_IN_PLAINTEXT', usage: 3 });

const a = await encryptAtRestValue(env, plain);
const b = await encryptAtRestValue(env, plain);
assert.equal(a.v, 1);
assert.equal(await decryptAtRestValue(env, a), plain);
assert.equal(await decryptAtRestValue(env, b), plain);
assert.notEqual(a.iv, b.iv, 'Cada cifrado debe usar un IV aleatorio distinto.');
assert.notEqual(a.ciphertext, b.ciphertext, 'El mismo texto no debe producir el mismo sobre cifrado.');
assert.ok(!JSON.stringify(a).includes('DO_NOT_STORE_THIS_IN_PLAINTEXT'));

await assert.rejects(() => encryptAtRestValue({ DYNAMIC_KEY_ENCRYPTION_SECRET: 'short' }, plain),
  /DYNAMIC_KEY_ENCRYPTION_SECRET/);
const tampered = { ...a, ciphertext: (a.ciphertext[0] === 'A' ? 'B' : 'A') + a.ciphertext.slice(1) };
await assert.rejects(() => decryptAtRestValue(env, tampered), 'AES-GCM debe rechazar ciphertext alterado.');

console.log('PASS key_at_rest: cifrado AES-GCM, round-trip, IV aleatorio, validación de secreto y detección de alteraciones.');
