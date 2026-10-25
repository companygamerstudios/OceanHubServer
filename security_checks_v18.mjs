import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(root, 'OceanHub_SECURITY_PATCHED_FINAL_v18.js');
const configPath = join(root, 'wrangler.production_v18.jsonc');
const preflightPath = join(root, 'preflight_deploy_v18.mjs');
const packagePath = join(root, 'package.json');

for (const path of [sourcePath, configPath, preflightPath, packagePath]) {
  assert.ok(existsSync(path), `Falta el archivo requerido: ${path}`);
}

const source = readFileSync(sourcePath, 'utf8');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const preflight = readFileSync(preflightPath, 'utf8');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));

assert.equal(config.name, 'oceanhud', 'El archivo de producción debe apuntar al Worker esperado.');
assert.equal(config.vars?.PAYPAL_MODE, 'live', 'La configuración de producción debe declarar live explícitamente.');
assert.ok(!Object.hasOwn(config, 'r2_buckets'), 'No debe haber una dependencia obligatoria de R2.');
assert.ok(!JSON.stringify(config.secrets?.required || []).includes('BACKUP_ENCRYPTION_SECRET'),
  'El secreto de backup no debe bloquear producción si los backups están desactivados.');

const requiredSecrets = config.secrets?.required || [];
const preflightBlock = preflight.match(/const requiredSecrets = \[([\s\S]*?)\];/);
assert.ok(preflightBlock, 'Preflight debe declarar la lista de secretos requeridos.');
const preflightSecrets = [...preflightBlock[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
for (const name of requiredSecrets) {
  assert.ok(preflightSecrets.includes(name), `Preflight no comprueba el secreto requerido ${name}.`);
  assert.ok(!Object.hasOwn(config.vars || {}, name), `${name} no puede ser a la vez Secret y vars en este archivo.`);
}
for (const name of ['DYNAMIC_KEY_ENCRYPTION_SECRET','DYNAMIC_KEY_INDEX_SECRET','ADMIN_SECOND_PIN','TOTP_SECRET',
  'HMAC_SECRET_CURRENT','PAYPAL_SECRET','PAYPAL_WEBHOOK_ID','BREVO_API_KEY','GEMINI_API_KEY',
  'OPENROUTER_API_KEY','STABLE_HORDE_API_KEY','GOOGLE_CLIENT_SECRET','DISCORD_CLIENT_SECRET']) {
  assert.ok(requiredSecrets.includes(name), `Falta ${name} en secrets.required.`);
}

assert.match(source, /function adminProtectedPath\(path\)/);
assert.match(source, /async function handleEncryptKeysAtRest\(env, request\)[\s\S]*?requireAdmin\(env, request\)/);
assert.match(source, /async function handleMigrateKeyIndexHmac\(env, request\)[\s\S]*?requireAdmin\(env, request\)/);
assert.match(source, /DYNAMIC_KEY_INDEX_SECRET debe ser distinto de DYNAMIC_KEY_ENCRYPTION_SECRET/);
assert.match(source, /DYNAMIC_KEY_ENCRYPTION_SECRET no está configurado o es demasiado corto/);
assert.match(source, /AES-GCM/);
assert.match(source, /HttpOnly; Secure; SameSite=Strict/);
assert.match(source, /object-src 'none'/);
assert.match(source, /frame-ancestors 'none'/);
assert.match(source, /X-Content-Type-Options/);
assert.ok(!/\beval\s*\(/.test(source), 'No debe añadirse eval() al Worker.');
assert.ok(!/\bnew\s+Function\s*\(/.test(source), 'No debe añadirse new Function() al Worker.');

assert.match(source, /async function handleAirFlowCreateImageV11\(env, request\)/);
assert.match(source, /env\.STABLE_HORDE_API_KEY/);
assert.match(source, /stablehorde\.net\/api\/v2\/generate\/async/);
assert.match(source, /máximo 5 intentos de generación por usuario\/IP cada hora/);

for (const [scriptName, command] of Object.entries(pkg.scripts || {})) {
  const match = command.match(/node\s+([\w.-]+\.mjs)/);
  if (match) assert.ok(existsSync(join(root, match[1])), `${scriptName} referencia un archivo inexistente: ${match[1]}`);
}

console.log('PASS security_checks_v18: comprobaciones estructurales de configuración, secretos y guardas críticas.');
console.log('LIMIT: estas pruebas estáticas no sustituyen una auditoría independiente ni pruebas de integración en staging.');
