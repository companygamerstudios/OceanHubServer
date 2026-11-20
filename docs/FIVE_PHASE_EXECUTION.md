# Ejecución de las cinco fases de OceanHub

**Rama:** feat/oceanhub-five-phase-execution
**Base:** la cadena de trabajo de OceanHub 3.0 (descargas PWA + shell Tauri).
**Regla de publicación:** no se despliega a producción desde esta rama.

## Estado ejecutivo

Esta entrega incorpora cortes seguros de las cinco fases y mantiene explícitos los elementos que dependen de infraestructura real, políticas comerciales o pruebas de instalación. No se presenta como terminación total de los cinco productos.

| Fase | Implementado en esta rama | Pendiente antes de considerarla completa |
|---|---|---|
| 1. Seguridad y estabilidad | Nonces atómicos ligados al hash de IP en Durable Object; limitación de emisión; validación de tamaño en /verify; protección Origin/Fetch Metadata para mutaciones con cookie de sesión; checkout/cancelación/canje mediante POST; CSV correctamente citado y neutralización de fórmulas; CSP Report-Only más estricta; registro idempotente de eventos PayPal | Migrar todas las páginas a CSP estricta sin unsafe-inline; auditoría OAuth/CSRF completa; revisión de logs completa; pentest externo; validación en producción |
| 2. Protección de datos | GET /account/export con perfil, compras/claves, suscripción, resumen de referidos, historial de acceso y resumen Seller; elimina hashes, sal y semillas 2FA de la exportación. Handler de backup cifrado y restore aditivo preparados para R2 | Crear bucket R2 y binding BACKUPS; configurar secreto independiente BACKUP_ENCRYPTION_SECRET; probar restore real. Snapshot limitado a 450 claves/6 MiB y falla cerrada si excede. Eliminación completa de cuenta permanece pendiente de mapa de retención y dependencias |
| 3. Pagos y vendedores | Ledger de event.id PayPal para duplicados; eventos de reembolso/reversión/disputa se marcan para conciliación manual; pedidos existentes conservan lock por orden | Marketplace todavía no cobra ni liquida a vendedores. Falta modelo de órdenes, payout/escrow, reembolsos automáticos, disputa y pruebas Sandbox integrales |
| 4. Experiencia social | Corrige fallback KV de presencia y evita revelar estado invisible; conserva heartbeat, rutas y respuesta de Friends. Ya hay base de soporte/notificaciones y Security Center en Ocean Suite | Solicitudes de mensajes, preferencias finas y un inbox unificado requieren endpoints, límites y pruebas de privacidad adicionales |
| 5. OceanHub 3.0 | Hereda /download, PWA, política de versión y shell Tauri 2 Windows/Android. Actualiza CI Android a setup-android v4 y evita el paquete SDK obsoleto tools | Login/OAuth/2FA nativos, builds nativos validados, firma comercial, APK/EXE/MSI oficiales, actualización firmada y recuperación. El shell no debe tratarse como app terminada |

## Cambios de contrato y compatibilidad

- POST /verify, GET /get-nonce, JSON de verificación y forma de la respuesta de verificación se conservan. El cliente Lua HMAC debe continuar solicitando un Nonce antes de firmar.
- /shop/create-checkout ahora requiere POST JSON (price_id, coupon, o tipo suscripcion y plan). El correo se resuelve exclusivamente desde la sesión.
- /claim-key acepta GET solo para mostrar el formulario; canjear requiere POST. GET con el código devuelve 405.
- /cancelar-renovacion y /pay-subscription requieren POST.
- /account/export es GET autenticado y devuelve JSON con Cache-Control no-store.
- /admin/backup usa GET para listar y POST JSON para crear/restaurar. Requiere admin, PIN secundario, R2 y cifrado independiente.
- Nuevos endpoints de Nonce viven dentro del Durable Object KVLocker; no exponen rutas públicas del Worker.

## Configuración operativa opcional de backups

1. Crear un bucket R2 separado (no reutilizar KV ni el bucket de activos públicos).
2. Configurar binding Worker BACKUPS hacia ese bucket.
3. Guardar BACKUP_ENCRYPTION_SECRET como Secret de Cloudflare, al menos 32 caracteres aleatorios y distinto de los secretos de claves/HMAC.
4. Configurar retención y permisos mínimos para el operador.
5. Crear backup, verificar objeto cifrado y restaurar en un entorno no productivo.
6. No ejecutar restore en producción hasta verificar formato, integridad y contenido.

El código no configura un bucket R2 automáticamente y responde 503 cuando falta el binding. Los respaldos de esta primera versión no incluyen sesiones, estados OAuth, nonces, OTP temporales, rate limits ni señales transitorias. La restauración solo agrega/actualiza claves; nunca hace borrado masivo.

## Condiciones de liberación

- Pasar npm run check:syntax, npm test, dry-run Wrangler local y build TypeScript/Tauri.
- Obtener estado verde de CI para esta rama/PR.
- Ejecutar prueba de integración del cliente Lua contra el Worker de Preview: emisión de Nonce, firma HMAC correcta, nonce repetido rechazado, firma inválida rechazada y compatibilidad exacta del JSON.
- Probar checkout con PayPal Sandbox y firma de webhook; confirmar evento duplicado no vuelve a otorgar beneficios.
- Validar R2 backup/restore con datos sintéticos en entorno aislado.
- Validar PWA y compilaciones nativas en Windows/Android.
- Revisar PRs apilados #19, #20 y #21 en orden, sin mezclar configuraciones de producción.

**No activar el despliegue a producción desde esta rama.** La integración requiere revisión humana y prueba real de compatibilidad, especialmente por los cambios a los métodos de checkout/canje.

## Prueba del cliente OceanHub V8

Se añadió `test/verify-integration.test.mjs`, que llama directamente a `workerFetch` con un Durable Object en memoria y ejecuta el contrato real de `/get-nonce` + `/verify`: HMAC SHA-256, éxito, firma incorrecta, repetición de Nonce e IP distinta. También se serializó el consumo de OAuth state con `withKVLock` para cerrar la carrera de get/delete.

Para ejecutar una prueba manual en el Worker de Preview con una clave de staging, sigue `docs/CLIENT_V8_TEST_GUIDE.md`. El proyecto no contiene el archivo fuente Lua del cliente que está instalado fuera de este repositorio, por lo que la prueba real en el executor todavía debe ejecutarse con tu copia del cliente.

## Compilación nativa

La configuración Tauri incluye ahora iconos PNG/ICO; el workflow Android no duplica `--apk`. La validación nativa debe producir artefactos de prueba no firmados; no son releases comerciales ni actualizaciones oficiales.
