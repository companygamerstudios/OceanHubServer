# Security remediation — scope and manual work

This PR is a first, bounded remediation pass. It does not claim all 100 checklist items are complete.

## Implemented in this branch
- Removed `handleMainRoute` after verifying its only occurrence was its unused declaration.

- Random suffixes for admin log keys, short URLs, and fallback social slugs now use 16 random bytes (128 bits).
- Adds HSTS to Worker responses.
- The admin-only `/webhook/test` endpoint returns 410 unless `ALLOW_WEBHOOK_TEST=true` is explicitly configured.
- Email addresses embedded in Discord/Telegram alert text are masked before sending.
- Caps key CSV uploads at 2 MiB and 10,000 non-empty records.
- Air Flow file/image upload paths enforce a bounded request size where `Content-Length` is present, a 10 MiB decoded-content limit, MIME allowlists and data-URL MIME consistency.
- Stable Horde errors tell the user which upstream status failed without logging the upstream response body or the API key.
- Air Flow UI and the privacy notice disclose that prompts/context/uploads can be sent to Gemini, OpenRouter or Stable Horde according to the feature and configuration.
- Removes the non-standard `secrets.required` property from Wrangler config and moves names-only inventory to `required-secrets.production.json`; the preflight checks the inventory against Cloudflare secret names.
- Fixes package scripts that referred to missing test files, pins the Wrangler version, uses a local/sandbox config for development, and runs smoke tests/dry-run in CI only.

## Already present in the reviewed source (needs live verification)

- `/sse` is included in `adminProtectedPath` and the gate calls `requireAdmin`.
- PIN comparison sites reviewed use `timingSafeCompare`.
- `/verify-web` and `/key-info` accept POST bodies and frontend requests already use POST with a JSON body.
- `Math.random` occurrences found in the reviewed source are UI animation effects, not security tokens.

## Manual operations; code repository access cannot perform these safely

1. In Cloudflare, rotate `TOTP_SECRET`, update/rebind the administrator's authenticator, and verify the admin `otp_secret` KV record without exposing the seed.
2. Securely verify the actual values of `DYNAMIC_KEY_ENCRYPTION_SECRET`, `DYNAMIC_KEY_INDEX_SECRET` and `BACKUP_ENCRYPTION_SECRET` are at least 32 characters, different, and recoverable from a protected out-of-band store. Never commit them here.
3. Rotate PayPal/Brevo/Gemini/OpenRouter/Discord/Google credentials if they were exposed; move sensitive dashboard values to Secrets; resolve all variable/secret name collisions.
4. Confirm whether sending prompts to Stable Horde is an approved data flow before enabling it in production.
5. Configure Cloudflare Access/IP allowlisting for admin routes and verify OAuth login cannot bypass enforced 2FA; confirm actual cookie/session invalidation behavior.
6. Verify production KV, rate limits, webhook signatures/idempotency, provider credentials and end-to-end flows with authorized tests.
7. Configure Cloudflare logs/alerts, email SPF/DKIM/DMARC and inbox tests, and a separate staging Worker/KV namespace with Sandbox credentials.
8. Create an encrypted off-site backup, then perform and record a restoration test.
9. Manually test accessibility, iPhone/Android layouts, legal text and privacy/cookie handling, plus account export/deletion and purchase lifecycle.
10. Commission an external penetration test before launch.

The CI suite is not a full pentest. It does not call Cloudflare production, list secret values, touch user KV data, rotate provider credentials, create new Cloudflare resources or deploy a Worker.
