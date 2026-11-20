# Ejecución de las cuatro fases activas de OceanHub

**Rama:** feat/oceanhub-five-phase-execution
**Base:** la cadena de trabajo de OceanHub 3.0 (descargas PWA + shell Tauri).
**Alcance acordado:** cuatro fases activas. Los backups en Cloudflare R2 quedan aplazados para evitar costes de almacenamiento.
**Regla de publicación:** no se despliega a producción desde esta rama.

## Estado ejecutivo

Esta entrega consolida cuatro áreas de trabajo y conserva el Worker actual. La exportación de datos personales sigue disponible porque no requiere R2; la copia de seguridad/restauración de todo el almacenamiento queda fuera del alcance actual.

| Fase | Implementado en esta rama | Pendiente antes de considerarla completa |
|---|---|---|
| 1. Seguridad y estabilidad | Nonces atómicos ligados al hash de IP en Durable Object; limitación de emisión; validación de tamaño en /verify; protección Origin/Fetch Metadata para mutaciones con cookie de sesión; checkout/cancelación/canje mediante POST; CSV correctamente citado y neutralización de fórmulas; CSP Report-Only más estricta; registro idempotente de eventos PayPal. Se conserva GET /account/export sin depender de R2 | Migrar todas las páginas a CSP estricta sin unsafe-inline; auditoría OAuth/CSRF completa; revisión de logs; pentest externo; validación en producción |
| 2. Pagos y vendedores | Ledger de event.id PayPal para duplicados; eventos de reembolso/reversión/disputa se marcan para conciliación manual; pedidos existentes conservan lock por orden | Marketplace todavía no cobra ni liquida a vendedores. Falta modelo de órdenes, payout/escrow, reembolsos automáticos, disputa y pruebas Sandbox integrales |
| 3. Experiencia social | Corrige fallback KV de presencia y evita revelar estado invisible; conserva heartbeat, rutas y respuesta de Friends. Ya hay base de soporte/notificaciones y Security Center en Ocean Suite | Solicitudes de mensajes, preferencias finas y un inbox unificado requieren endpoints, límites y pruebas de privacidad adicionales |
| 4. OceanHub 3.0 | Hereda /download, PWA, política de versión y shell Tauri 2 Windows/Android. CI prepara un instalador Windows NSIS .exe sin firma y un APK Android arm64 debug; actualiza setup-android v4, iconos Tauri y Maven Central/Google en buildSrc Android | Login/OAuth/2FA nativos, firma comercial, paquetes oficiales y updater firmado. MSI queda fuera de este build de prueba por la restricción de prerelease de Tauri. El shell no debe tratarse como app terminada |

## Alcance de datos y almacenamiento

- **Se mantiene** GET /account/export, autenticado y con Cache-Control no-store. Devuelve datos de cuenta permitidos y excluye hashes, sales, semillas 2FA y material de sesión.
- **Se aplaza** el backup/restauración cifrados en Cloudflare R2. No crear un bucket, no añadir un binding BACKUPS y no configurar BACKUP_ENCRYPTION_SECRET para probar esta entrega.
- El handler /admin/backup que quedó preparado previamente no forma parte de las cuatro fases activas. Sin binding BACKUPS responde 503 y falla cerrado; no se necesita para el funcionamiento normal de la aplicación.
- La exportación de cuenta no sustituye una copia de seguridad operativa del Worker/KV. Antes de una futura publicación de producción habrá que decidir un mecanismo de recuperación que se ajuste al presupuesto. El runbook R2 queda archivado como opción futura, no como requisito actual.
- La eliminación completa de cuentas sigue pendiente de un mapa de retención y dependencias.

## Cambios de contrato y compatibilidad

- POST /verify, GET /get-nonce, JSON de verificación y forma de la respuesta de verificación se conservan. El cliente Lua HMAC debe continuar solicitando un Nonce antes de firmar.
- /shop/create-checkout ahora requiere POST JSON (price_id, coupon, o tipo suscripcion y plan). El correo se resuelve exclusivamente desde la sesión.
- /claim-key acepta GET solo para mostrar el formulario; canjear requiere POST. GET con el código devuelve 405.
- /cancelar-renovacion y /pay-subscription requieren POST.
- /account/export es GET autenticado y devuelve JSON con Cache-Control no-store.
- /admin/backup está fuera del alcance operativo de esta entrega y no se debe configurar ni invocar.

## Condiciones de liberación de estas cuatro fases

- Pasar npm run check:syntax, npm test, dry-run Wrangler local y build TypeScript/Tauri.
- Obtener estado verde de los quality gates de GitHub para esta rama/PR.
- Ejecutar prueba de integración del cliente Lua contra un Worker de Preview: emisión de Nonce, firma HMAC correcta, nonce repetido rechazado, firma inválida rechazada y compatibilidad exacta del JSON.
- Probar checkout con PayPal Sandbox y firma de webhook; confirmar que un evento duplicado no vuelve a otorgar beneficios.
- Validar PWA y compilaciones nativas en Windows/Android.
- Revisar PRs apilados #19, #20 y #21 en orden, sin mezclar configuraciones de producción.
- Los backups R2 no son una condición para completar ni probar estas cuatro fases.

**No activar el despliegue a producción desde esta rama.** La integración requiere revisión humana y prueba real de compatibilidad, especialmente por los cambios a los métodos de checkout/canje. El estado verde de pruebas automatizadas no sustituye la prueba del cliente Lua ni la validación de servicios externos.

## Prueba del cliente OceanHub V8

Se añadió `test/verify-integration.test.mjs`, que llama directamente a `workerFetch` con un Durable Object en memoria y ejecuta el contrato real de `/get-nonce` + `/verify`: HMAC SHA-256, éxito, firma incorrecta, repetición de Nonce e IP distinta. También se serializó el consumo de OAuth state con `withKVLock` para cerrar la carrera de get/delete.

Para ejecutar una prueba manual en el Worker de Preview con una clave de staging, sigue `docs/CLIENT_V8_TEST_GUIDE.md`. El proyecto no contiene el archivo fuente Lua del cliente que está instalado fuera de este repositorio, por lo que la prueba real en el executor todavía debe ejecutarse con tu copia del cliente.

## Compilación nativa

La configuración Tauri incluye iconos PNG/ICO; el workflow Android no duplica `--apk`. La validación nativa produce artefactos de prueba no firmados; no son releases comerciales ni paquetes firmados.

### Estado de compilación nativa

El instalador Windows de esta fase es NSIS `.exe` sin firma; MSI queda fuera hasta cambiar la versión prerelease a un formato numérico compatible. Android se compila como APK arm64 de depuración. Ninguno de estos archivos es una release oficial ni un paquete firmado. Los archivos deben considerarse disponibles solo después de que el job `OceanHub Native build validation` termine en verde y los artefactos aparezcan en su Summary.
