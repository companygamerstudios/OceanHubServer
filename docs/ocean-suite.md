# OceanHub Platform Suite

Esta entrega integra un punto de entrada y módulos complementarios sin reemplazar las funciones existentes del Worker.

## Acceso

- **/ocean**: centro de acceso para usuarios.
- **/admin/ocean-command**: Command Center (solo OceanHub Staff).
- **/admin/ocean-features**: Feature Control (solo OceanHub Staff).
- **/ocean/support** y **/admin/ocean-support**: tickets privados para usuarios y equipo.
- **/ocean/market** y **/admin/ocean-market**: catálogo de vendedores con revisión administrativa.
- **/ocean/security**: cerrar las demás sesiones conservando la sesión actual.
- **/ocean/reputation**: XP y logros verificables.
- **/ocean/developers**: guías de integración y seguridad.
- **/ocean/launcher**: acceso a los proyectos ya publicados.
- **/ocean/air-flow**: estado de proveedores y enlaces al Air Flow actual.
- **/admin/ocean-backups**: estado y procedimiento seguro de respaldos.
- **/ocean/verified**: solicitudes de insignia azul (figura pública) o amarilla (empresa/afiliación).
- **/admin/ocean-verifications**: revisión, aprobación, rechazo y retirada de insignias (solo Staff).

La barra lateral de Inicio contiene el enlace **Ocean Suite**.

## Correspondencia con las 15 ideas

| Idea | Estado de esta entrega |
|---|---|
| Command Center | Nuevo panel administrativo con bindings, conteos limitados y enlaces operativos. |
| Social avanzado | Se reutilizan Feed, Friends, Messages, Crews y perfiles existentes. |
| Notificaciones | Se reutiliza /notifications y socialPushNotif; no se crea un inbox paralelo. |
| Marketplace | Nuevo catálogo de publicaciones de vendedores, con aprobación/rechazo de Staff. |
| Security Center | Nueva acción para invalidar las demás sesiones sin revelar tokens. |
| Support Desk | Nuevos tickets privados, respuestas de usuario y respuestas administrativas. |
| Achievements | Nuevos logros derivados de XP real; no se inventan ventas ni victorias. |
| Air Flow 2.0 | Nuevo Workspace que enlaza el motor y Studio existentes y muestra solo si cada proveedor está configurado. |
| Events | Se reutilizan Ocean Events y Ocean Arena existentes. |
| Reputation | Nuevo nivel transparente derivado de XP y rol; no se usa para sancionar. |
| Developer Hub | Nueva zona de documentación y buenas prácticas. |
| Live Status | Se reutiliza /status; Ocean Suite lo enlaza. |
| Launcher | Nuevo centro de accesos a Creator Studio, Arena, Parties, Events, Feed y Air Flow. |
| Backup Center | Nuevo panel de procedimiento y estado; no exporta secretos ni datos KV sin cifrado. |
| Feature Control | Nuevos interruptores para los módulos adicionales de Ocean Suite. |
| OceanHub Verified | Solicitudes de insignia con evidencia pública HTTPS, aprobación exclusiva de Staff, correo de resultado y retirada auditada. |

## Límites deliberados de seguridad

- El Marketplace no realiza cobros todavía. Las publicaciones permanecen en revisión hasta que Staff las apruebe. No se muestra un botón de compra ni se reutiliza un checkout no verificado.
- Backup Center no genera una copia restaurable todavía. Una exportación sin cifrado autenticado podría exponer datos personales, hashes de contraseñas y material de sesión. Tampoco se requiere R2.
- Command Center muestra presencia de bindings/proveedores, no valores secretos. El registro detallado de errores y alertas debe seguir configurándose desde Cloudflare Observability.
- La revocación de otras sesiones incrementa sessionVersion y actualiza la sesión actual; las sesiones antiguas dejan de superar requireAuth.
- Feature Control afecta únicamente los módulos nuevos de esta suite. No desactiva Feed, Air Flow, Events, Arena ni otros módulos existentes.
- Las pruebas nuevas son pruebas automatizadas de comportamiento con KV simulado. CI debe completar los smoke tests y el dry-run de Wrangler antes de integrar.

## Validación y publicación

La rama de trabajo no publica a producción. El Pull Request ejecuta los controles de calidad; el workflow de producción se activa únicamente al llegar un commit a main, de acuerdo con deploy-production.yml.

\n## OceanHub Verified\n\n- La insignia azul identifica una figura pública cuya presencia pública fue revisada por Staff.\n- La insignia amarilla identifica una empresa o a una persona con afiliación confirmada; el registro conserva el nombre de la empresa y la relación declarada.\n- El usuario presenta una solicitud con un enlace público HTTPS y una explicación. No se solicitan documentos de identidad ni credenciales.\n- Las solicitudes quedan pendientes y no conceden insignias automáticamente. Solo cuentas con rol admin y 2FA exigido por la configuración pueden aprobar, rechazar o retirar insignias.\n- La aprobación, rechazo o retirada se registra en KV. OceanHub intenta enviar un correo mediante Brevo y una notificación interna cuando el servicio está disponible; la decisión queda guardada aunque el proveedor de correo no acepte el mensaje.\n- Una insignia solo se representa si existe un registro activo del lado del servidor. El usuario no puede asignarla editando su perfil.\n- La revisión de evidencia y la confirmación de afiliación son decisiones humanas de Staff; un enlace por sí solo no constituye una garantía automática de autenticidad.\n

## Unificación de rutas de verificación

- La única página para solicitar insignias es `/ocean/verified`; las URLs antiguas `/verification/request` redirigen allí.
- El único centro de revisión es `/admin/ocean-verifications`; `/admin/social`, `/admin/verificacion` y `/admin/verification-requests` redirigen allí.
- El antiguo endpoint manual `/admin/verify-user` está retirado (HTTP 410). Las insignias nuevas solo se conceden desde OceanHub Verified.
- Las solicitudes antiguas se migran al nuevo centro cuando se abre la cola administrativa. Se conservan fecha, motivo y cuenta; se identifican como heredadas porque no incluyen enlace de evidencia.
- `/admin/verification-audit` permanece como archivo histórico de decisiones antiguas; no permite revisar ni aprobar solicitudes.
- Los menús del usuario y el panel administrativo enlazan a las rutas oficiales nuevas.
