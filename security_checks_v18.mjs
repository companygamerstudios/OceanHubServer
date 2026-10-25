import assert from 'node:assert/strict';
import { workerSource as source, productionConfig as config, requireCheck } from './repo-audit-helpers.mjs';

const criticalSecrets = [
  'DYNAMIC_KEY_ENCRYPTION_SECRET',
  'DYNAMIC_KEY_INDEX_SECRET',
  'ADMIN_SECOND_PIN',
  'TOTP_SECRET',
  'HMAC_SECRET_CURRENT',
  'PAYPAL_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'BREVO_API_KEY',
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY',
  'GOOGLE_CLIENT_SECRET',
  'DISCORD_CLIENT_SECRET'
];
const configuredSecrets = new Set(config.secrets?.required || []);

for (const name of criticalSecrets) {
  requireCheck(configuredSecrets.has(name), 'La configuración enumera el secreto crítico ' + name);
}

requireCheck(config.name === 'oceanhud', 'La configuración de producción apunta al Worker oceanhud');
requireCheck(config.vars?.PAYPAL_MODE === 'live', 'La configuración de producción declara PAYPAL_MODE=live explícitamente');
requireCheck(!Object.keys(config.vars || {}).some(name => /(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)/i.test(name)),
  'No hay nombres de secretos dentro de vars en el archivo de producción');
requireCheck(!Object.prototype.hasOwnProperty.call(config, 'r2_buckets'), 'La configuración de producción no depende de un bucket R2');
requireCheck(config.kv_namespaces?.some(item => item.binding === 'STATS' && /^[a-f0-9]{32}$/i.test(item.id || '')),
  'Existe una vinculación STATS con identificador KV de 32 caracteres');

requireCheck(source.includes('export async function hashDynamicKey'), 'Las claves dinámicas usan la función de índice HMAC');
requireCheck(source.includes('DYNAMIC_KEY_INDEX_SECRET debe ser distinto de DYNAMIC_KEY_ENCRYPTION_SECRET'),
  'El índice HMAC rechaza reutilizar el secreto de cifrado');
requireCheck(source.includes("name: 'AES-GCM'") && source.includes('crypto.subtle.encrypt') && source.includes('crypto.subtle.decrypt'),
  'El cifrado de valores almacenados usa AES-GCM');
requireCheck(source.includes('function timingSafeCompare'), 'La comparación HMAC usa comparación de tiempo constante');
requireCheck(source.includes('await env.STATS.delete(nonceKey)'), 'Los nonces de verificación son de un solo uso');
requireCheck(source.includes("'/admin/encrypt-keys-at-rest'") && source.includes("'/admin/migrate-key-index-hmac'"),
  'Las rutas de migración están identificadas como rutas administrativas protegidas');
requireCheck(source.includes("frame-ancestors 'none'") && source.includes("'X-Content-Type-Options', 'nosniff'"),
  'Se establecen cabeceras defensivas de seguridad web');
requireCheck(source.includes('function escapeHTML(value)'), 'Existe escape HTML para valores insertados en páginas');
requireCheck(source.includes('env.STABLE_HORDE_API_KEY'), 'Stable Horde obtiene la clave desde el entorno del servidor');
requireCheck(source.includes('ownerHash') && source.includes('af_img_job_'),
  'Las consultas de generación Stable Horde se vinculan a la cuenta propietaria');

assert.doesNotMatch(source, /\bsk-or-v1-[A-Za-z0-9]{20,}\b/, 'No debe haber una clave OpenRouter literal en el código');
assert.doesNotMatch(source, /\bAIza[0-9A-Za-z_-]{20,}\b/, 'No debe haber una clave Google literal en el código');
assert.doesNotMatch(source, /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, 'No debe haber claves privadas incrustadas');

console.log('✅ Auditoría estática finalizada. Esto no sustituye pruebas de integración ni revisión independiente.');
