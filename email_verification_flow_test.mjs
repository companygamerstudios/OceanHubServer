import { workerSource as source, requireCheck } from './repo-audit-helpers.mjs';

requireCheck(source.includes('const EMAIL_VERIFICATION_TTL = 86400'), 'Los enlaces de verificación tienen caducidad definida');
requireCheck(source.includes('async function issueEmailVerification'), 'Existe el emisor central de enlaces de verificación');
requireCheck(source.includes('email_verify_current_'), 'El sistema mantiene un token vigente por cuenta');
requireCheck(source.includes('if (previous) await env.STATS.delete'), 'Al emitir un enlace nuevo se invalida el anterior');
requireCheck(source.includes("checkActionRateLimit(env, 'email-verify'"), 'La confirmación está limitada por intentos');
requireCheck(source.includes('email-verify:') && source.includes('withKVLock'), 'La confirmación usa un bloqueo para evitar carreras concurrentes');
requireCheck(source.includes('email_verify_' + '$' + '{token}') && source.includes('email_verify_current_' + '$' + '{email}'),
  'El flujo elimina el token y el identificador vigente tras completarse');
requireCheck(source.includes('password.length < 8 || password.length > 128'), 'La contraseña de confirmación valida longitud');
requireCheck(source.includes('password !== password2'), 'La confirmación exige que ambas contraseñas coincidan');
requireCheck(source.includes('/email/verify?token='), 'Los enlaces apuntan al endpoint de verificación dedicado');

console.log('✅ Comprobaciones estáticas del flujo de email superadas; falta una prueba end-to-end con proveedor de correo.');
