# Ocean Hub — auditoría antes de producción

**Estado: NO AUTORIZADO PARA DESPLEGAR.** Esta lista no ejecuta despliegues. La configuración de producción usa `PAYPAL_MODE=live`; no se deben realizar pruebas de pago con dinero real.

## 1. Archivos y pruebas

- [x] Crear un `wrangler.jsonc` para desarrollo local con Worker y KV distintos de producción.
- [x] Crear `wrangler.test_v18.jsonc` con un namespace local separado.
- [x] Crear `wrangler.staging.template_v18.jsonc`; todavía hay que convertirla en `wrangler.staging.jsonc`, crear un KV nuevo en Cloudflare y reemplazar los marcadores.
- [x] Reponer los scripts de prueba que estaban referenciados en `package.json`.
- [x] Añadir un workflow de GitHub Actions que solo ejecuta pruebas. **No contiene un paso de despliegue ni necesita tokens de Cloudflare.**
- [ ] Revisar el resultado real de GitHub Actions y corregir cada fallo antes de aceptar cambios.
- [ ] Ejecutar `npm test` en el entorno del desarrollador y conservar el registro sin valores secretos.
- [ ] Ejecutar `npm run dev`; guardar el resultado de arranque y probar la interfaz local. Las pruebas estáticas no sustituyen esta prueba manual.
- [ ] Pedir revisión independiente del código y de los resultados.

Las pruebas de contrato inspeccionan el código y las unitarias llaman a funciones criptográficas exportadas. No simulan por completo OAuth, SMTP, PayPal, KV, Durable Objects ni proveedores de IA; para esos flujos se necesita staging.

## 2. Secretos de Cloudflare

En **Workers & Pages → oceanhud → Configuración → Variables y secretos**, confirma solo los **nombres y tipos**; no copies los valores en GitHub, logs, capturas, este chat ni tickets.

Secretos obligatorios de producción:
- `DYNAMIC_KEY_ENCRYPTION_SECRET`
- `DYNAMIC_KEY_INDEX_SECRET`
- `ADMIN_SECOND_PIN`
- `TOTP_SECRET`
- `HMAC_SECRET_CURRENT`
- `PAYPAL_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `BREVO_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `GOOGLE_CLIENT_SECRET`
- `DISCORD_CLIENT_SECRET`

También comprueba que `BASE_URL`, `PAYPAL_MODE`, `ADMIN_REQUIRE_2FA`, `SENDER_NAME`, `GEMINI_MODEL` y `OPENROUTER_MODEL` estén creadas como **Variables** cuando correspondan, no duplicadas como Secrets.

Guarda `DYNAMIC_KEY_ENCRYPTION_SECRET`, `DYNAMIC_KEY_INDEX_SECRET` y `HMAC_SECRET_CURRENT` (además de `HMAC_SECRET_PREVIOUS`, si aún se utiliza) en un gestor de contraseñas con recuperación. Nunca las guardes en el repositorio ni en un archivo `.dev.vars` versionado. No cambies el secreto de cifrado de claves ya almacenadas: cambiarlo sin re-cifrar puede hacerlas irrecuperables.

## 3. TOTP y migraciones

- [ ] Antes de rotar `TOTP_SECRET`, confirma que hay acceso al panel de administración y un método de recuperación. Sustituye el Secret y vuelve a vincular la app autenticadora de inmediato.
- [ ] Revisa el registro del administrador en KV y cualquier campo `otp_secret` de forma controlada; no edites claves de KV a mano sin una copia segura.
- [ ] No llames a `/admin/encrypt-keys-at-rest` ni a `/admin/migrate-key-index-hmac` todavía. Aunque ambos exigen autenticación de admin, POST y segundo PIN, son migraciones que modifican datos.
- [ ] Solo después de una copia verificable y una migración completada, elimina o deshabilita esas rutas de mantenimiento y verifica que ya no se puedan invocar.

## 4. Copias de seguridad

- La ruta de backup devuelve `410 BACKUP_DISABLED_NO_EXTERNAL_STORAGE`. No afirma que haya generado una copia.
- [ ] Definir una estrategia de backup fuera de Cloudflare antes de migrar datos o rotar secretos de cifrado.
- [ ] Restaurar una copia en un entorno separado y comprobar que el contenido puede descifrarse.
- [ ] No dependas solo de un archivo local no cifrado ni subas backups con datos personales al repositorio.

## 5. Staging aislado

1. Crea un KV nuevo: `npx wrangler kv namespace create oceanhub-staging-stats`.
2. Copia `wrangler.staging.template_v18.jsonc` como `wrangler.staging.jsonc`; reemplaza el nombre del Worker, el hostname HTTPS y el ID KV por los recursos **de staging**. No uses el ID de `STATS` de producción.
3. Crea el Worker de staging y configura secretos de prueba propios. Usa credenciales de PayPal Sandbox y callback URLs OAuth de staging; no copies secretos de producción.
4. Ejecuta `npm run deploy:staging` solo cuando este staging esté completo y aprobado. La plantilla deliberadamente contiene marcadores que deben fallar en el preflight.

Pruebas manuales en staging:
- Claves: `/verify`, `/verify-web`, `/key-info`, bloqueo, un solo uso y vínculo IP.
- Registro, email de verificación de un solo uso y recuperación de cuentas antiguas.
- Login con 2FA, con prueba de recuperación de acceso.
- OAuth de Google y Discord con URLs de staging.
- PayPal Sandbox: compra, cupón agotado, captura repetida y webhook repetido.
- IA: Gemini, OpenRouter y Stable Horde si el proveedor de imágenes está configurado; verifica errores y límites cuando falten claves o haya rate limiting.

## 6. Revisión final y producción

- [ ] Confirmar que CI pasa en el commit exacto.
- [ ] Probar staging, restauración de backup y flujos de pagos.
- [ ] Confirmar que las variables no chocan con los Secrets del panel.
- [ ] Revisar los logs de aplicación por mensajes de error; no registrar tokens ni contenido privado.
- [ ] Obtener una segunda revisión independiente documentada.
- [ ] Solo entonces considerar producción, con ventana de vigilancia de logs y pagos.

**Este documento no es un certificado de seguridad ni evidencia de que las pruebas externas hayan pasado.**
