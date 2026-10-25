import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encryptBackupPayload, decryptBackupPayload, redactStoredKeyFields } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const source = readFileSync(new URL('./OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const backupEnv = { BACKUP_ENCRYPTION_SECRET: 'test-only-backup-secret-0123456789abcdef0123456789abcdef' };
const payload = JSON.stringify({ schema: 1, sample: 'backup-fixture', keys: [{ id: 1 }] });
const envelopeText = await encryptBackupPayload(backupEnv, payload);
const envelope = JSON.parse(envelopeText);
assert.equal(envelope.format, 'OceanHubEncryptedBackup');
assert.equal(envelope.algorithm, 'AES-256-GCM');
assert.equal(await decryptBackupPayload(backupEnv, envelopeText), payload);
await assert.rejects(() => decryptBackupPayload(backupEnv, '{bad json'));
const damaged = { ...envelope, ciphertext: (envelope.ciphertext[0] === 'A' ? 'B' : 'A') + envelope.ciphertext.slice(1) };
await assert.rejects(() => decryptBackupPayload(backupEnv, damaged));

const redacted = redactStoredKeyFields({ key: 'SECRET-KEY-123456', nested: { keys: ['ABCD', 'ANOTHER-SECRET-9988'] } });
assert.equal(redacted.key, '••••3456');
assert.equal(redacted.nested.keys[0], '••••');
assert.equal(redacted.nested.keys[1], '••••9988');

const migrations = [
  ['async function handleEncryptKeysAtRest(env, request)', 'async function handleMigrateKeyIndexHmac(env, request)'],
  ['async function handleMigrateKeyIndexHmac(env, request)', 'function']
];
for (const [name, next] of migrations) {
  const start = source.indexOf(name);
  assert.ok(start >= 0, `Falta el handler: ${name}`);
  const end = source.indexOf(next, start + name.length);
  const block = source.slice(start, end > start ? end : start + 6500);
  assert.match(block, /requireAdmin\(env, request\)/);
  assert.match(block, /request\.method !== 'POST'/);
  assert.match(block, /ADMIN_SECOND_PIN/);
  assert.match(block, /timingSafeCompare/);
}
assert.match(source, /BACKUP_DISABLED_NO_EXTERNAL_STORAGE/);
assert.match(source, /return jsonResponse\([\s\S]{0,500}BACKUP_DISABLED_NO_EXTERNAL_STORAGE[\s\S]{0,180}, 410\)/);

console.log('PASS backup_migration_tools: sobre AES-GCM, redacción de claves y protección admin/PIN de migraciones.');
console.log('LIMIT: el endpoint de backup está desactivado (410); esta prueba no crea ni restaura backups reales.');
console.log('ACTION: confirma manualmente si las migraciones ya se ejecutaron; desactívalas después de verificarlas.');
