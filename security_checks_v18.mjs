import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');
const source = await read('./OceanHub_SECURITY_PATCHED_FINAL_v18.js');
const production = JSON.parse(await read('./wrangler.production_v18.jsonc'));
const local = JSON.parse(await read('./wrangler.jsonc'));
const lockTest = JSON.parse(await read('./wrangler.test_v18.jsonc'));
const staging = JSON.parse(await read('./wrangler.staging.template_v18.jsonc');
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}
function bodyOf(name, endName) {
  const start = source.indexOf(name);
  assert.notEqual(start, -1, `No se encontró ${name}`);
  const end = source.indexOf(endName, start + name.length);
  assert.notEqual(end, -1, `No se encontró el final de ${name}`);
  return source.slice(start, end);
}

check('Las claves dinámicas usan HMAC-SHA-256', /name:\s*'HMAC',\s*hash:\s*'SHA-256'/.test(source));
check('La clave HMAC debe tener al menos 32 caracteres', /DYNAMIC_KEY_INDEX_SECRET[^\n]{0,100}32 caracteres|secret\.length < 32/.test(source));
check('El secreto de índice no puede ser el de cifrado', source.includes('DYNAMIC_KEY_INDEX_SECRET debe ser distinto de DYNAMIC_KEY_ENCRYPTION_SECRET'));
check('El cifrado de claves usa AES-GCM con IV aleatorio de 12 bytes', source.includes("new Uint8Array(12)") && source.includes("name: 'AES-GCM', iv"));
check('La cookie de sesión contiene HttpOnly, Secure y SameSite', /session_token=.*HttpOnly; Secure; SameSite=Strict/.test(source));
check('Se aplican CSP y anti-framing', source.includes("Content-Security-Policy") && source.includes("frame-ancestors 'none'") && source.includes("'X-Frame-Options', 'DENY'"));
check('Los headers incluyen nosniff y Referrer-Policy', source.includes("'X-Content-Type-Options', 'nosniff'") && source.includes("'Referrer-Policy'"));
check('El modo de PayPal falla cerrado si no es sandbox o live', source.includes("PAYPAL_MODE debe configurarse explícitamente como sandbox o live"));
check('La generación Stable Horde usa el secreto del entorno y no una clave embebida', source.includes('env.STABLE_HORDE_API_KEY') && source.includes("'apikey': apiKey") && !/apikey\s*:\s*['"][^'"]{20,}['"]/.test(source));
check('Stable Horde restringe NSFW en la solicitud', source.includes('nsfw: false') && source.includes('censor_nsfw: true'));
check('La generación de imágenes tiene un límite por usuario/IP', source.includes('async function afImageRateLimit') && source.includes('máximo 5 intentos de generación'));
check('Los backups permanecen desactivados y no hay binding R2 configurado', source.includes('BACKUP_DISABLED_NO_EXTERNAL_STORAGE') && !Object.hasOwn(production, 'r2_buckets'));
check('La configuración de producción no exige el secreto de backups desactivado', !production.secrets.required.includes('BACKUP_ENCRYPTION_SECRET'));
check('La configuración local no usa el nombre del Worker de producción', local.name !== production.name);
check('La configuración del test de bloqueo no usa el nombre del Worker de producción', lockTest.name !== production.name);
check('El STATS local es distinto del namespace STATS de producción', local.kv_namespaces[0].id !== production.kv_namespaces[0].id && lockTest.kv_namespaces[0].id !== production.kv_namespaces[0].id);
check('El desarrollo local usa PayPal Sandbox', local.vars.PAYPAL_MODE === 'sandbox' && lockTest.vars.PAYPAL_MODE === 'sandbox');
check('La plantilla de staging usa sandbox y exige sustituir el KV de marcador', staging.vars.PAYPAL_MODE === 'sandbox' && staging.kv_namespaces[0].id.includes('REPLACE_WITH'));
check('La configuración local mantiene las claves fuera de vars', !Object.keys(local.vars).some(k => /API_KEY|SECRET|TOKEN|PASSWORD/i.test(k)));
check('El preflight comprueba existencia de secretos sin imprimir valores', (await read('./preflight_deploy_v18.mjs')).includes('wrangler',) && (await read('./preflight_deploy_v18.mjs')).includes('Faltan secretos requeridos'));

const required = production.secrets.required;
for (const name of [
  'DYNAMIC_KEY_ENCRYPTION_SECRET','DYNAMIC_KEY_INDEX_SECRET','ADMIN_SECOND_PIN','TOTP_SECRET',
  'HMAC_SECRET_CURRENT','PAYPAL_SECRET','PAYPAL_WEBHOOK_ID','BREVO_API_KEY','GEMINI_API_KEY',
  'OPENROUTER_API_KEY','GOOGLE_CLIENT_SECRET','DISCORD_CLIENT_SECRET'
]) check(`Producción declara el secreto requerido ${name}`, required.includes(name));

console.log(`security_checks_v18: ${checks.length} comprobaciones superadas.`);
console.warn('AVISO: son comprobaciones de contrato/estructura; no sustituyen un pentest ni pruebas end-to-end en un staging aislado.');
