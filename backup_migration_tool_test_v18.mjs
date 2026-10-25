import assert from 'node:assert/strict';
import { workerSource as source, productionConfig as config, functionSection, requireCheck } from './repo-audit-helpers.mjs';

requireCheck(!Object.prototype.hasOwnProperty.call(config, 'r2_buckets'), 'Producción no necesita una vinculación de almacenamiento R2');
requireCheck(!(config.secrets?.required || []).includes('BACKUP_ENCRYPTION_SECRET'),
  'El secreto de backup no es requisito para desplegar la versión sin almacenamiento externo');
requireCheck(source.includes('BACKUPS DEL SERVIDOR DESACTIVADOS: SIN ALMACENAMIENTO EXTERNO'),
  'El código documenta que los backups del servidor están desactivados');

const doBackup = functionSection('function doBackup() {', 'const hourlyLabels');
requireCheck(doBackup.includes('Las copias de seguridad del servidor están desactivadas'),
  'El botón de backup no afirma que se haya creado una copia');
assert.doesNotMatch(doBackup, /fetch\s*\(/, 'El botón desactivado no llama a un endpoint de backup');

for (const [start, end, name] of [
  ['async function handleEncryptKeysAtRest(env, request)', 'async function handleMigrateKeyIndexHmac(env, request)', 'cifrado de claves'],
  ['async function handleMigrateKeyIndexHmac(env, request)', 'async function ', 'migración de índices HMAC']
]) {
  const section = functionSection(start, end);
  requireCheck(section.includes('requireAdmin(env, request)'), 'La operación de ' + name + ' exige admin');
  requireCheck(section.includes("request.method !== 'POST'"), 'La operación de ' + name + ' solo permite POST');
}
requireCheck(source.includes("'/admin/encrypt-keys-at-rest'") && source.includes("'/admin/migrate-key-index-hmac'"),
  'Las dos rutas de migración están marcadas como administrativas');

console.log('✅ Comprobaciones de backup y migración superadas. Estas comprobaciones no crean ni restauran backups.');
