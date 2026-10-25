# Estado de la lista de seguridad (1–100)

Estado de esta pasada: PR #4. Este documento distingue cambios subidos, hallazgos estáticos y trabajo que sigue pendiente. **No significa que los 100 puntos estén cerrados.** No se desplegó nada en Cloudflare y no se accedió a valores secretos ni a datos de usuarios.

## Cambios hechos en esta rama

- **11:** STABLE_HORDE_API_KEY aparece en la lista de secretos requerida por Wrangler y en la comprobación previa al despliegue. Esto valida el nombre, no el valor ni su aceptación por Stable Horde.
- **13, 98, 100:** se documenta que prompts, contexto, archivos e imágenes pueden pasar a Gemini, OpenRouter o Stable Horde según la función/configuración; se añadieron avisos en Air Flow y la política de privacidad.
- **20:** los tres flujos admin que validan PIN registran fallos por IP y por identificador hash de la cuenta, con ventana de 10 minutos.
- **24:** los tres sufijos de ID que usaban 4 bytes ahora usan 16 bytes aleatorios.
- **27–28 (parcial):** sendAlert enmascara emails incrustados en alertas; no equivale a una auditoría de los 53 console.error ni de todos los caminos de alerta.
- **30:** el Worker añade Strict-Transport-Security: max-age=31536000 sin includeSubDomains.
- **43:** /webhook/test queda desactivado (410) salvo que se habilite explícitamente con ALLOW_WEBHOOK_TEST=true; además queda tras el gate admin existente.
- **45:** se eliminó handleMainRoute después de comprobar que solo tenía una aparición y no era llamado.
- **46:** /admin/upload-keys limita CSV a 2 MiB y 10.000 líneas no vacías, con comprobación del tipo declarado y de multipart inválido.
- **47 (parcial):** Air Flow limita tamaño decodificado a 10 MiB, restringe MIME declarado y valida su coherencia con data URLs. El chequeo anticipado de tamaño usa Content-Length cuando existe; aún no es una validación profunda de firmas binarias de todos los formatos.
- **51, 54–56, 59, 74:** desarrollo usa configuración local/sandbox separada; el script productivo usa wrangler.production_v18.jsonc; se corrigieron scripts de prueba rotos, se quitó el script de staging que apuntaba a una configuración inexistente, se ignoran archivos de secretos locales y se fijó Wrangler a una versión exacta. CI hace pruebas y dry-run, no despliegue.
- **53 (decisión corregida):** no se quitó secrets.required. La documentación actual oficial de Wrangler lo define como una configuración soportada y dice que el despliegue valida sus nombres. Ver https://developers.cloudflare.com/workers/wrangler/configuration/. Se mantiene el campo estándar y se incluye Stable Horde.
- **97:** el error de Stable Horde muestra el estado HTTP y una orientación más específica sin registrar el cuerpo del proveedor ni la clave.
- **README y pruebas:** se añadió documentación de despliegue y seguridad; pruebas estructurales de las protecciones relevantes; CI no despliega producción.

## Revisado estáticamente; falta prueba real

- **15:** /sse está incluido en adminProtectedPath y el gate llama a requireAdmin; hay que verificarlo contra el Worker desplegado.
- **21:** las comparaciones de PIN revisadas usan timingSafeCompare; una nueva auditoría completa sigue pendiente.
- **22, 25, 26:** los endpoints revisados usan POST y el cuerpo JSON para PIN/clave, no query string. Se debe revisar el navegador para confirmar que el PIN no aparece en historial o telemetría.
- **31:** no encontré Access-Control-Allow-Origin en el archivo revisado; no sustituye una prueba de todas las respuestas/rutas en producción.
- **35:** el estado OAuth se guarda con TTL y se consume/elimina en el callback.
- **36 (parcial):** el redirect URI se construye a partir de BASE_URL y rutas de callback fijas; no se implementó una allowlist explícita de URLs completas.
- **38:** requireAuth compara sessionVersion; falta prueba real de que un cambio de contraseña invalide cada sesión anterior.
- **39 (parcial):** se observaron flags HttpOnly, Secure y SameSite en cookies de sesión y OAuth; falta auditoría completa de cookies y prueba de navegador.
- **42 (parcial):** el procesamiento del pago se serializa por orden PayPal y se mantiene estado paypal_processed_<orderId>; aún no se guarda un ledger explícito de IDs de evento webhook.

## Acciones manuales necesarias

1. **#1–2:** rotar TOTP_SECRET, volver a vincular el autenticador y revisar el registro otp_secret del admin en KV sin revelar la semilla.
2. **#3–4:** comprobar de forma segura que los tres secretos de cifrado tienen al menos 32 caracteres, son distintos y cuentan con copia de recuperación fuera de Cloudflare.
3. **#5–6:** rotar los secretos de PayPal, Brevo, Gemini, OpenRouter, Discord y Google si fueron expuestos fuera de su almacén seguro.
4. **#7–10:** completar la rotación HMAC en su ventana correcta, mover variables sensibles a Secrets, resolver choques Variable/Secret del panel y revisar logs/repositorio/alertas para confirmar que no se filtró el valor de STATIC_KEYS_JSON.
5. **#12 y #14:** decidir expresamente si se permite enviar prompts/archivos a Stable Horde y qué proveedores quedan activos. La configuración actual de la rama principal ya menciona Stable Horde; este PR no representa aprobación de privacidad.
6. **#15, #18, #37–39:** hacer pruebas reales de /sse, OAuth con cuentas admin que tengan 2FA, recuperación/identidad legacy, invalidación de sesiones y cookies.
7. **#16–17, #41, #49–50:** ejecutar y verificar las migraciones antes de retirar herramientas admin; configurar Cloudflare Access o allowlist; probar webhook real en PayPal Sandbox; hacer pruebas autorizadas de fuerza bruta y una prueba de penetración externa.
8. **#52, #57–58, #61–62:** revisar las variables reales y decidir sobre keep_vars; crear Worker/KV/DO de staging separados con PayPal Sandbox; comprobar rollback y activar logs/alertas 5xx en Cloudflare.
9. **#63–69:** configurar alertas de fallos de captura/webhook, medir CPU/subrequests, validar índices/operaciones KV concurrentes, revisar retención real de logs y crear un backup externo cifrado con una restauración ensayada.
10. **#75–81:** revisar compatibility_date antes de los despliegues, avisar a usuarios antiguos, probar expiración/uso único de enlaces, configurar SPF/DKIM/DMARC y probar entrega de email en Gmail/Outlook/iPhone.
11. **#82–91:** validar el ciclo de compra/suscripción con PayPal Sandbox: errores de checkout, confirmaciones, recuperación de compras, términos/reembolsos, renovaciones/cancelación/expiración, cupones, precios y guardado de perfil.
12. **#92–96 y #99:** realizar QA de accesibilidad, móvil y temas; decidir canal/tiempo de soporte; revisar la configuración de claves de pago/IA/correo; implementar y probar exportación/borrado de cuenta/datos si se confirma que no existe.

## Trabajo técnico aún no cerrado en esta pasada

- **#16, #19, #27 completo, #29, #32–34, #36 allowlist explícita, #40, #42 ledger de ID de evento, #48:** falta cerrar la retirada de endpoints tras migraciones ejecutadas, exigir TOTP a operaciones destructivas, auditar todos los logs, reducir unsafe-inline con nonce/hash, limitar Permissions Policy solo a Air Flow Live, auditar exhaustivamente innerHTML/localStorage, implementar verificación CSRF, registrar IDs de webhook y auditar la renderización/escape de salida IA.
- **#60, #63–67, #70–73:** falta completar rollback/responsables, alertas en cada fallo de captura/webhook, medición de rendimiento, índices y atomicidad KV, retención verificada, catálogo de endpoints con estado, auditoría de rutas Air Flow duplicadas y dividir el Worker monolítico de ~617 KB. Este PR añade CI/PRs, pero no crea tags de release ni efectúa rollback.
- **#76–79, #82–91, #95, #99:** falta comprobar e implementar, donde no exista, la experiencia de avisos de usuarios, enlaces de verificación, mensajes de error, compras, renovaciones, soporte, exportación y borrado. No se marca como completo sin prueba de la web real.

## Límites

Las pruebas de CI son smoke tests de código; no son un pentest, no certifican todos los flujos y no verifican valores secretos. Para desplegar, primero debe revisarse y aprobarse el PR, completar las operaciones manuales y ejecutar el preflight con Wrangler autenticado.
