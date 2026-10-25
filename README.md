# Ocean Hub

Ocean Hub is a Cloudflare Worker application with authentication, payments, social features and Air Flow AI integrations.

## Local development

Requirements: Node.js 22+ and npm.

```sh
npm install
npm run dev
npm run check:syntax
npm test
```

Local development uses `wrangler.local.jsonc` and PayPal sandbox mode. It is intentionally a different Worker name and URL from production. Configure local-only credentials in `.dev.vars`; never commit that file.

## Production deployment

Production deployment is only available through:

```sh
npm run deploy:production
```

This runs the preflight and then deploys with `wrangler.production_v18.jsonc`. The preflight checks the required secret names in Cloudflare using Wrangler's supported `secrets.required` configuration field; it cannot read secret values and therefore cannot certify their length, uniqueness or correctness. Those checks require secure runtime verification or a manual secret manager review. This field contains names only; never put secret values in this repository. See the [official Wrangler configuration documentation](https://developers.cloudflare.com/workers/wrangler/configuration/).

No staging Worker or KV namespace is created by this repository. Do not deploy staging until a separate Worker, independent KV namespace, separate Durable Object storage and PayPal Sandbox credentials have been created and tested. This repository does not auto-deploy from the quality workflow.

The production config currently retains `keep_vars: true`: per Cloudflare's [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/configuration/), that preserves dashboard variables not reconciled by the deployment. This can help avoid accidental deletion of dashboard-managed variables, but it also allows configuration drift. Do not remove it until the dashboard variables have been inventoried and the config is confirmed as the source of truth.

## Security remediation pass 1

This branch hardens random suffixes, HSTS, disables the test webhook by default, bounds CSV and Air Flow upload size/MIME, improves the Stable Horde failure message without logging its response body, and discloses third-party AI processing in the UI and privacy page. Automated tests are structural smoke tests, not a penetration test or certification.

The Worker code can validate encryption-secret length and separation when those secrets are used, but Cloudflare's secret-list command exposes only names, not values. Do not copy TOTP seeds or API/encryption keys into chat, logs, issues or screenshots. Rotate credentials through their respective provider dashboards when exposure is suspected.

Before production release, manually complete and record: rotate/rebind admin TOTP, safely inspect the admin KV record, verify three encryption secrets are at least 32 characters and distinct, store recovery copies out-of-band, rotate any exposed provider credentials, verify current/previous HMAC rotation, convert sensitive dashboard variables to Secrets, inspect secret/variable name collisions in Cloudflare, decide whether AI prompt forwarding to Stable Horde is approved, configure Cloudflare Access/IP restriction, verify OAuth 2FA/redirects/session revocation/CSRF and PayPal webhook signature/idempotency with real Sandbox events, activate logs and 5xx/provider/webhook alerts, create and restore an encrypted off-site backup, test email DNS and inbox delivery, test mobile/accessibility, and arrange an external penetration test. Do not treat the CI tests as a substitute for these operations.
