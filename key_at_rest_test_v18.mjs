import assert from 'node:assert/strict';
import { encryptAtRestValue, decryptAtRestValue } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const env = { DYNAMIC_KEY_ENCRYPTION_SECRET: 'enc-' + 'E'.repeat(60) };
const plain = 'Ocean Hub dynamic key :: TEST-ONLY-DO-NOT-USE';
const encrypted = await encryptAtRestValue(env, plain);
assert.equal(encrypted.v, 1, 'Debe incluir versión del formato');
assert.equal(Buffer.from(encrypted.iv, 'base64').length, 12, 'AES-GCM necesita un IV de 12 bytes');
assert.notEqual(encrypted.ciphertext, plain, 'El texto debe quedar cifrado');
assert.equal(await decryptAtRestValue(env, encrypted), plain, 'El descifrado debe recuperar el original');

const encryptedAgain = await encryptAtRestValue(env, plain);
assert.notEqual(encrypted.iv, encryptedAgain.iv, 'El IV se debe generar aleatoriamente para cada cifrado');
assert.notEqual(encrypted.ciphertext, encryptedAgain.ciphertext, 'Cifrados repetidos deben diferir por el IV');
await assert.rejects(() => decryptAtRestValue({ DYNAMIC_KEY_ENCRYPTION_SECRET: 'another-' + 'Z'.repeat(55) }, encrypted));

const tampered = { ...encrypted };
const bytes = Buffer.from(tampered.ciphertext, 'base64');
bytes[bytes.length - 1] ^= 1;
tampered.ciphertext = bytes.toString('base64');
await assert.rejects(() => decryptAtRestValue(env, tampered));
await assert.rejects(() => encryptAtRestValue({ DYNAMIC_KEY_ENCRYPTION_SECRET: 'short' }, plain), /demasiado corto/, 'Debe rechazar secretos de cifrado cortos');
await assert.rejects(() => decryptAtRestValue(env, { v: 9, iv: encrypted.iv, ciphertext: encrypted.ciphertext }), /Formato/, 'Debe rechazar versiones de formato desconocidas');

console.log('key_at_rest_test_v18: 10 comprobaciones criptográficas superadas.');
