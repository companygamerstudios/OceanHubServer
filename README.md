# Ocean Hub

Ocean Hub is a Cloudflare Worker application with an Ocean Liquid Glass interface and integrations for authentication, AI providers, email, and PayPal.

## Start locally

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

The default development configuration is `wrangler.local.jsonc`. It uses a separate local Worker name and **PayPal sandbox**. Do not put API keys or credentials in this file. Local auth, email, OAuth, and AI features that require provider credentials will remain unavailable until you configure local-only secrets.

## Quality checks

```sh
npm run check:syntax
npm test
```

The smoke tests validate the payment-mode fail-closed behavior, key configuration assumptions, baseline security headers, and the required Durable Object fail-closed response. They are not a substitute for integration tests, penetration testing, or review of live Cloudflare resources.

## Cloudflare deployment

Production and staging deployments are deliberately separate from local development:

- Production config: `wrangler.production_v18.jsonc`
- Staging config expected by the deployment preflight: `wrangler.staging.jsonc`

Before deploying, configure the required secrets in the correct Cloudflare Worker environment, verify KV and Durable Object bindings, and run the matching preflight. The production config uses PayPal **live** mode. Do not deploy to production until checkout, webhook signature verification, refunds/duplicate-event handling, account recovery, OAuth, email delivery, backups, and monitoring have been tested against the actual Cloudflare environment.

Never commit API keys, OAuth client secrets, PINs, TOTP seeds, encryption keys, payment credentials, customer data, or production backups. If a credential has been committed or exposed, rotate it at its provider; deleting the text from Git history alone is not sufficient.

## Deployment limitations

A green GitHub Actions run validates only the checks defined in this repository. It does not prove that external provider credentials are valid, that Cloudflare bindings exist, that payment events are handled correctly in production, or that the service is secure against every attack. Keep deployment credentials in GitHub/Cloudflare secret stores and require human review for production changes.
