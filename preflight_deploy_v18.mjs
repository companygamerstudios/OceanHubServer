import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const target = String(process.argv[2] || '').toLowerCase();
if (!['production', 'staging'].includes(target)) {
  console.error('Uso: node preflight_deploy_v18.mjs production|staging');
  process.exit(2);
}
const configPath = target === 'production' ? 'wrangler.production_v18.jsonc' : 'wrangler.staging.jsonc';
if (!existsSync(configPath)) {
  console.error(`Falta ${configPath}. Para staging, copia wrangler.staging.template_v18.jsonc y sustituye el ID de KV y la URL.`);
  process.exit(2);
}
let config;
try { config = JSON.parse(readFileSync(configPath, 'utf8')); }
catch (error) { console.error(`No pude leer ${configPath}: ${error.message}`); process.exit(2); }
const errors = [];
if (!existsSync(config.main || '')) errors.push(`No existe el archivo main: ${config.main}`);
if (!config.vars?.BASE_URL || !/^https:\/\//i.test(config.vars.BASE_URL)) errors.push('BASE_URL debe ser una URL HTTPS absoluta.');
const expectedMode = target === 'production' ? 'live' : 'sandbox';
if (config.vars?.PAYPAL_MODE !== expectedMode) errors.push(`PAYPAL_MODE debe ser exactamente ${expectedMode} en ${target}.`);
if (!config.kv_namespaces?.some(item => item.binding === 'STATS' && /^[a-f0-9]{32}$/i.test(item.id || '') && !/^0+$/.test(item.id))) {
  errors.push('STATS necesita un ID de namespace KV real de 32 caracteres hexadecimales, no un marcador ni el ID local ficticio.');
}
if (target === 'production') {
  if (config.name !== 'oceanhud') errors.push('El nombre de producción no coincide con oceanhud; no despliego una configuración con otro nombre accidental.');
  if (config.vars?.BASE_URL !== 'https://oceanhud.yoelenmanuelzorrilla.workers.dev') errors.push('La BASE_URL de producción cambió; verifica el hostname antes de desplegar.');
} else {
  if (!/^oceanhub-staging/.test(config.name || '')) errors.push('El nombre del Worker de staging debe distinguirse de producción.');
  if (String(config.vars?.BASE_URL || '').includes('oceanhud.yoelenmanuelzorrilla.workers.dev')) errors.push('Staging no puede apuntar al hostname de producción.');
  const prod = JSON.parse(readFileSync('wrangler.production_v18.jsonc', 'utf8'));
  const prodKV = prod.kv_namespaces?.find(item => item.binding === 'STATS')?.id;
  const stageKV = config.kv_namespaces?.find(item => item.binding === 'STATS')?.id;
  if (prodKV && stageKV === prodKV) errors.push('Staging comparte el namespace STATS de producción; crea uno separado.');
}
if (errors.length) {
  console.error(`\n⛔ Preflight ${target}: BLOQUEADO\n` + errors.map(e => `- ${e}`).join('\n'));
  process.exit(1);
}

// Deployment is intentionally gated on the critical secret names existing in Cloudflare now.
let requiredSecrets;
try {
  const inventory = JSON.parse(readFileSync(resolve('required-secrets.production.json'), 'utf8'));
  requiredSecrets = Array.isArray(inventory.required) ? inventory.required : [];
  if (!requiredSecrets.length || requiredSecrets.some(name => typeof name !== 'string' || !/^[A-Z][A-Z0-9_]+$/.test(name))) {
    throw new Error('El inventario de secretos está vacío o contiene nombres inválidos.');
  }
} catch (error) {
  console.error(`No se pudo cargar required-secrets.production.json: ${error.message}`);
  process.exit(2);
}
const list = spawnSync('npx', ['wrangler', 'secret', 'list', '--config', configPath, '--format', 'json'], {
  encoding: 'utf8', shell: process.platform === 'win32', timeout: 30000
});
if (list.error || list.status !== 0) {
  console.error(`\n⛔ No se pudo comprobar la lista de secretos en Cloudflare (${list.error?.message || list.stderr || 'Wrangler devolvió un error'}). Inicia sesión con Wrangler y vuelve a ejecutar el preflight; no despliegues a ciegas.`);
  process.exit(1);
}
let secrets;
try { secrets = JSON.parse(list.stdout); }
catch { console.error('Wrangler no devolvió JSON válido al listar secretos; despliegue bloqueado.'); process.exit(1); }
const names = new Set((Array.isArray(secrets) ? secrets : secrets?.secrets || []).map(item => item?.name).filter(Boolean));
// A Cloudflare Secret and a Wrangler vars entry cannot safely share a name.
// Detect existing dashboard secrets that conflict with config vars before deploy.
const collisions = Object.keys(config.vars || {}).filter(name => names.has(name));
if (collisions.length) {
  errors.push(`Hay secretos de Cloudflare que chocan con vars del archivo (${collisions.join(', ')}). Para cada uno, elimina el Secret y créalo como Variable no sensible antes de desplegar.`);
}
const missing = requiredSecrets.filter(name => !names.has(name));
if (errors.length) {
  console.error(`\n⛔ Preflight ${target}: BLOQUEADO\n` + errors.map(e => `- ${e}`).join('\n'));
  process.exit(1);
}
if (missing.length) {
  console.error(`\n⛔ Faltan secretos requeridos en Cloudflare para ${target}:\n` + missing.map(name => `- ${name}`).join('\n'));
  process.exit(1);
}
console.log(`✅ Preflight ${target} correcto: configuración y secretos críticos encontrados. No se ha desplegado nada todavía.`);
