# Security remediation — scope and manual work

This PR is a first, bounded remediation pass. It does not claim all 100 checklist items are complete.

## Implemented in this branch
- Removed `handleMainRoute` after verifying its only occurrence was its unused declaration.
- PIN brute-force throttling now tracks both client IP and a SHA-256 hash of the admin account identity for the three PIN-gated admin operations.

- Random suffixes for admin log keys, short URLs, and fallback social slugs now use 16 random bytes (128 bits).
- Adds HSTS to Worker responses.
- The admin-only `/webhook/test` endpoint returns 410 unless `ALLOW_WEBHOOK_TEST=true` is explicitly configured.
- Email addresses embedded in Discord/Telegram alert text are masked before sending.
- Caps key CSV uploads at 2 MiB and 10,000 non-empty records.
- Air Flow file/image upload paths enforce a bounded request size where `Content-Length` is present, a 10 MiB decoded-content limit, MIME allowlists and data-URL MIME consistency.
- Stable Horde errors tell the user which upstream status failed without logging the upstream response body or the API key.
- Air Flow UI and the privacy notice disclose that prompts/context/uploads can be sent to Gemini, OpenRouter or Stable Horde according to the feature and configuration.
- Keeps Wrangler's supported `secrets.required` field as a names-only inventory; the preflight checks the configured names against Cloudflare secret names. `BACKUP_ENCRYPTION_SECRET` is not a production deployment requirement while the external-backup endpoint is explicitly disabled.
- Fixes package scripts that referred to missing test files, pins the Wrangler version, uses a local/sandbox config for development, and runs smoke tests/dry-run in CI only.

## Already present in the reviewed source (needs live verification)

- `/sse` is included in `adminProtectedPath` and the gate calls `requireAdmin`.
- PIN comparison sites reviewed use `timingSafeCompare`.
- `/verify-web` and `/key-info` accept POST bodies and frontend requests already use POST with a JSON body.
- `Math.random` occurrences found in the reviewed source are UI animation effects, not security tokens.

## Manual operations; code repository access cannot perform these safely

1. In Cloudflare, rotate `TOTP_SECRET`, update/rebind the administrator's authenticator, and verify the admin `otp_secret` KV record without exposing the seed.
2. Securely verify the actual values of `DYNAMIC_KEY_ENCRYPTION_SECRET` and `DYNAMIC_KEY_INDEX_SECRET` are at least 32 characters, different, and recoverable from a protected out-of-band store. `BACKUP_ENCRYPTION_SECRET` is only needed if the encrypted-backup helper is deliberately enabled; backups are disabled in this version. Never commit secret values here.
3. Rotate PayPal/Brevo/Gemini/OpenRouter/Discord/Google credentials if they were exposed; move sensitive dashboard values to Secrets; resolve all variable/secret name collisions.
4. Confirm whether sending prompts to Stable Horde is an approved data flow before enabling it in production.
5. Configure Cloudflare Access/IP allowlisting for admin routes and verify OAuth login cannot bypass enforced 2FA; confirm actual cookie/session invalidation behavior.
6. Verify production KV, rate limits, webhook signatures/idempotency, provider credentials and end-to-end flows with authorized tests.
7. Configure Cloudflare logs/alerts, email SPF/DKIM/DMARC and inbox tests, and a separate staging Worker/KV namespace with Sandbox credentials.
8. Before production, define an affordable off-site recovery method and test it. Cloudflare R2 is optional and is explicitly outside the four active phases; do not create a paid bucket just to test this branch.
9. Manually test accessibility, iPhone/Android layouts, legal text and privacy/cookie handling, plus account export/deletion and purchase lifecycle.
10. Commission an external penetration test before launch.

**Wrangler note:** item 53 of the supplied list assumes `secrets.required` is non-standard. I checked Cloudflare's current [Wrangler configuration documentation](https://developers.cloudflare.com/workers/wrangler/configuration/), which documents this field as supported and says deployment validates it. This branch therefore keeps the supported field instead of removing it. Item 52 remains a review decision: `keep_vars: true` preserves dashboard variables and can allow drift, so remove it only after checking the live dashboard settings.

The CI suite is not a full pentest. It does not call Cloudflare production, list secret values, touch user KV data, rotate provider credentials, create new Cloudflare resources or deploy a Worker.


## Segunda pasada — rama five-phase-execution

Se añadieron Nonces atómicos con consumo en Durable Object ligado al hash de IP, limitación de emisión, controles cross-site para mutaciones con cookie, métodos POST para checkout/canje/cancelación, protección CSV, CSP Report-Only más estricta y ledger de eventos PayPal. Se añadió exportación de datos de cuenta sin hashes de contraseña, sal, semillas 2FA ni sesiones. El backup cifrado depende de R2 y de `BACKUP_ENCRYPTION_SECRET`; no se ha probado ni habilitado en producción. Marketplace sigue sin checkout/payout y la eliminación total de cuenta sigue pendiente de una política de retención y mapa de dependencias.


## Controles adicionales de la rama five-phase-execution

- El consumo de OAuth state ahora se serializa con Durable Object lock, y el registro se elimina dentro de la sección crítica para impedir que dos callbacks acepten el mismo state en paralelo.
- Se agregó una prueba de integración HMAC para el flujo `/get-nonce` + `/verify`, incluida la protección contra replay y el enlace de IP.
- Se añadió guía de prueba manual para clientes Lua; recuerda que un secreto incrustado en un script cliente distribuido puede extraerse y no sustituye autenticación por usuario/dispositivo.
