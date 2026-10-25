import assert from 'node:assert/strict';
import { encryptAtRestValue, decryptAtRestValue } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const env = {
  DYNAMIC_KEY_ENCRYPTION_SECRET: 'a'.repeat(64),
  DYNAMIC_KEY_INDEX_SECRET: 'b'.repeat(64)
};
const plaintext = 'TEST-ONLY-KEY-DO-NOT-USE-IN-PRODUCTION';

const encrypted1 = await encryptAtRestValue(env, plaintext);
const encrypted2 = await encryptAtRestValue(env, plaintext);

assert.equal(encrypted1.v, 1, 'Debe marcar versión del formato');
assert.notEqual(encrypted1.iv, encrypted2.iv, 'Cada cifrado debe usar un IV aleatorio');
assert.notEqual(encrypted1.ciphertext, plaintext, 'El texto plano no debe aparecer como ciphertext');
assert.equal(await decryptAtRestValue(env, encrypted1), plaintext, 'Debe recuperar el texto original con el secreto correcto');
await assert.rejects(
  decryptAtRestValue({ ...env, DYNAMIC_KEY_ENCRYPTION_SECRET: 'c'.repeat(64) }, encrypted1),
  undefined,
  'Un secreto distinto no debe descifrar el contenido'
);
await assert.rejects(
  encryptAtRestValue({ ...env, DYNAMIC_KEY_ENCRYPTION_SECRET: 'short' }, plaintext),
  /demasiado corto/,
  'Debe rechazar secretos débiles'
);

console.log('✅ Pruebas criptográficas locales de cifrado/descifrado superadas.');
