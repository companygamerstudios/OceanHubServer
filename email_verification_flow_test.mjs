import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./OceanHub_SECURITY_PATCHED_FINAL_v18.js', import.meta.url), 'utf8');
const start = source.indexOf('async function handleEmailVerification(env, request)');
assert.notEqual(start, -1, 'Debe existir el handler de verificación por email');
const end = source.indexOf('\nasync function ', start + 10);
assert.notEqual(end, -1, 'No se pudo delimitar el handler de verificación');
const handler = source.slice(start, end);

assert.match(source, /EMAIL_VERIFICATION_TTL\s*=\s*86400/, 'Los enlaces deben caducar en 24 horas');
assert.match(handler, /\^\[a-f0-9\]\{64\}\$\/i, 'El token debe tener formato hexadecimal de 64 caracteres');
assert.match(handler, /email_verify_current_\$\{email\}/, 'Solo se debe aceptar el token más reciente por email');
assert.match(handler, /checkActionRateLimit\(env, 'email-verify'/, 'La finalización del flujo debe limitar intentos');
assert.match(handler, /withKVLock\(env, `email-verify:\$\{email\}`/, 'La consumición del token debe estar bloqueada frente a concurrencia');
assert.match(handler, /password !== password2/, 'Debe comprobar que ambas contraseñas coincidan');
assert.match(handler, /await env\.STATS\.delete\(`email_verify_\$\{token\}`)/, 'El token debe borrarse cuando se consume');
assert.ok(handler.indexOf("if (request.method === 'GET')") < handler.indexOf("if (request.method !== 'POST')"), 'GET solo presenta el formulario; no debe establecer la contraseña');
assert.match(handler, /createUser\(env, email, displayName, password/, 'El registro pendiente crea una cuenta después del POST válido');
assert.match(handler, /sessionVersion = Number\(user\.sessionVersion \|\| 0\) \+ 1/, 'La recuperación invalida sesiones anteriores');

console.log('email_verification_flow_test: 10 comprobaciones superadas (contratos estáticos; no envía correo real).');
