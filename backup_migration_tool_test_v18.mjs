import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const config = JSON.parse(await readFile(new URL('./wrangler.production_v18.jsonc', import.meta.url), 'utf8'));
function functionBody(startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `No se encontró ${startText}`);
  const end = source.indexOf(endText, start + startText.length);
  assert.notEqual(end, -1, `No se encontró el final de ${startText}`);
  return source.slice(start, end);
}
const backup = functionBody('async function handleBackup(env, request)', '\nasync function handleUploadKeys');
assert.match(backup, /requireAdmin\(env, request\)/, 'El endpoint de backup debe requerir administración');
assert.match(backup, /BACKUP_DISABLED_NO_EXTERNAL_STORAGE/, 'El endpoint debe reconocer que los backups están desactivados');
assert.match(backup, /\}, 410\)/, 'No debe fingir que se creó una copia de seguridad');

for (const [name, end] of [
  ['async function handleEncryptKeysAtRest(env, request)', '\nasync function '],
  ['async function handleMigrateKeyIndexHmac(env, request)', '\nasync function ']
]) {
  const fn = functionBody(name, end);
  assert.match(fn, /requireAdmin\(env, request\)/, `${name} debe requerir admin`);
  assert.match(fn, /request\.method !== 'POST'/, `${name} debe aceptar solo POST`);
  assert.match(fn, /ADMIN_SECOND_PIN/, `${name} debe requerir el segundo PIN`);
}
assert.ok(!Object.hasOwn(config, 'r2_buckets'), 'La configuración no debe depender de un bucket R2 no disponible');
assert.ok(!config.secrets.required.includes('BACKUP_ENCRYPTION_SECRET'), 'Los backups desactivados no deben bloquear el despliegue por un secreto ausente');

console.log('backup_migration_tool_test_v18: comprobaciones de backup y migración superadas. Las migraciones no se ejecutaron.');
