# Ocean Hub — validación local y seguridad

## Lo que prepara esta rama

- `wrangler.jsonc` y `wrangler.test_v18.jsonc` son configuraciones para desarrollo local con nombres distintos y KV local simulado. **No crean Workers por sí mismas.**
- No crea un Worker de staging remoto. Para pruebas de staging reales haría falta elegir un Worker separado y un namespace KV nuevo, con PayPal Sandbox y credenciales OAuth de prueba.
- Los scripts hacen comprobaciones de sintaxis, pruebas criptográficas reales para cifrado/HMAC y comprobaciones estáticas de varias rutas e invariantes. **No son pruebas end-to-end** de login, email, OAuth, pagos, webhooks ni Stable Horde.

## Ejecutar pruebas localmente

Requisitos: una versión compatible de Node.js y dependencias instaladas.

```bash
npm install
npm test
npm run dev
```

El servidor de desarrollo usa `wrangler.jsonc`, el nombre `oceanhub-local-only`, KV local y `PAYPAL_MODE=sandbox`. No agregues el parámetro `--remote`.

Para guardar los registros en PowerShell:

```powershell
npm test 2>&1 | Tee-Object npm-test.log
npm run dev 2>&1 | Tee-Object wrangler-dev.log
```

Ejecuta el segundo comando en otra terminal para conservar ambos registros; detén `wrangler dev` con Ctrl+C.

## Variables locales

1. Copia `.dev.vars.example` como `.dev.vars`.
2. Genera secretos aleatorios de prueba distintos; no reutilices secretos de producción ni los del autenticador administrativo real.
3. Deja las API keys vacías para probar solo el arranque seguro. Para probar proveedores externos, usa claves de prueba y revisa la cuota/coste antes de activarlas.
4. `.dev.vars` está en `.gitignore`. No lo subas a GitHub.

## Protección de producción

- Cloudflare está conectado a la rama `main` y usa `npm run deploy:production`. Un commit en `main` puede iniciar compilación y despliegue automáticos.
- Esta rama es `audit/staging-harness-stablehorde`; no la cambies a la rama de producción hasta revisar y aprobar los resultados.
- No ejecutes `npm run deploy:production` durante estas pruebas.
- No ejecutes `wrangler deploy` con las configuraciones locales.
- El Worker de producción tiene `PAYPAL_MODE=live`; no se deben probar pagos reales para verificar un cambio técnico.
- Los backups externos siguen desactivados; una prueba local no crea ni restaura una copia de los datos de producción.
- Los endpoints `/admin/encrypt-keys-at-rest` y `/admin/migrate-key-index-hmac` son herramientas de migración. No los llames sin una copia recuperable, revisión del código y plan de recuperación.

## Qué sigue pendiente antes de aprobar producción

- Ejecutar `npm test` y `wrangler dev` en tu laptop, conservando sus logs.
- Pruebas end-to-end en un entorno aislado para email, login con 2FA, OAuth, PayPal Sandbox, webhooks y proveedores de IA.
- Un método de backup/restauración fuera de Cloudflare que haya sido probado.
- Una segunda revisión de código y de los resultados del entorno de pruebas.

Las comprobaciones locales por sí solas no autorizan un despliegue de producción.
