# Ocean Hub: auditoría y pruebas locales

## Estado

Esta rama es de revisión: `audit-hardening-2026-10-25`. No se ha desplegado desde esta rama y no debe fusionarse con `main` hasta revisar los cambios y completar las pruebas de integración.

## Qué añade

- Configuraciones Wrangler locales con Worker names distintos y namespaces KV simulados diferentes.
- Plantilla de staging intencionalmente inválida hasta que se cambien el hostname, nombre y un ID KV real e independiente.
- Pruebas de los helpers criptográficos reales de AES-GCM, HMAC, PayPal mode, tema y cabeceras.
- Comprobaciones estructurales del flujo de verificación de email, rutas de migración, copia de seguridad y el contrato de secretos.
- El secreto `STABLE_HORDE_API_KEY` queda comprobado tanto en el preflight como en `secrets.required`, porque el entorno del panel tiene `AF_IMAGE_PROVIDER=stablehorde`.

## Pruebas locales

Requisitos: una versión de Node.js compatible con Wrangler 4 y dependencias instaladas.

```sh
npm install
npm test
npm run dev
```

`npm test` no despliega ni hace llamadas de pago, correo, OAuth o generación de imágenes. Algunas comprobaciones son estáticas; no sustituyen pruebas end-to-end con servicios reales. `npm run dev` usa `wrangler.jsonc`, cuyo Worker y KV son locales y separados de producción, con PayPal Sandbox y generación de imágenes desactivada.

## Seguridad y producción

- No uses `wrangler.jsonc` ni `wrangler.test_v18.jsonc` para desplegar.
- No hagas pruebas de pago con el Worker de producción mientras `PAYPAL_MODE=live`.
- No cambies los secretos de cifrado de claves sin un plan probado de re-cifrado y recuperación.
- El backup del servidor sigue desactivado; las pruebas del sobre cifrado no significan que exista un backup operativo.
- Los endpoints de migración requieren administrador y PIN, pero continúan presentes. Después de confirmar que ya no hacen falta, hay que decidir y aplicar su desactivación con una revisión independiente.
- Rotar `TOTP_SECRET` requiere coordinar el secreto real con el panel y volver a enlazar el autenticador del administrador; esta rama no rota secretos ni modifica KV.
- Antes de fusionar: revisar los tests, ejecutar `wrangler dev` localmente, aportar logs sin secretos y pedir una segunda revisión independiente.
