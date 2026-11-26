# OceanHub isolated staging / Preview runbook

**Status: not provisioned.** This document is a safe checklist, not permission to create Cloudflare resources or deploy. Do not use the production Worker, KV namespace, PayPal live credentials, Firebase production service account, or production OAuth clients for staging.

## 1. Create isolated Cloudflare resources

1. Create a dedicated Worker name such as `oceanhub-staging-<suffix>`.
2. Create a new KV namespace dedicated to staging. Do not reuse the production `STATS` namespace ID.
3. Copy `wrangler.staging.template_v18.jsonc` to `wrangler.staging.jsonc` locally.
4. Replace the Worker name, staging hostname, and `STATS` namespace ID. Keep `PAYPAL_MODE` set to `sandbox`.
5. Keep the `KV_LOCKER` Durable Object binding and SQLite migration. Do not bind the staging Worker to production Durable Object state.
6. Confirm the Workers AI binding is available for the staging Worker.

## 2. Configure staging-only credentials

Configure secrets and variables in the staging Worker only. Use separate staging credentials wherever the provider supports them:

- Unique `DYNAMIC_KEY_ENCRYPTION_SECRET`, `DYNAMIC_KEY_INDEX_SECRET`, `HMAC_SECRET_CURRENT`, `TOTP_SECRET`, and admin PIN.
- PayPal Sandbox client secret and Sandbox webhook ID.
- Staging email provider credentials or a mail sink.
- Separate OAuth client secrets with staging callback URLs.
- AI provider keys with explicit usage limits.
- Firebase staging service account and a separate `PUSH_TOKEN_ENCRYPTION_SECRET`.
- Firebase Web config and VAPID key as public variables only if testing browser push.

Never paste secret values into GitHub files, logs, screenshots, pull requests, or this chat. Do not copy a production secret into the staging environment.

## 3. Validate before production

1. Run syntax and unit tests locally: `npm run check:syntax` and `npm test`.
2. Run Wrangler dry-run against the staging config: `npx wrangler deploy --dry-run --config wrangler.staging.jsonc`.
3. Verify the staging Worker name and STATS namespace ID before deploying.
4. Deploy only to staging: `npx wrangler deploy --config wrangler.staging.jsonc`.
5. Test authentication, 2FA, OAuth, email verification, account export, Air Flow, Agent Tasks concurrency, push registration/unregistration, Android, Windows tray, and PayPal Sandbox.
6. Test with two separate OceanHub accounts and at least one physical Android device and one Windows machine.
7. Record results without secrets. Confirm no staging test touched production KV or live PayPal.

## 4. Production release gate

The production deployment workflow is manual-only. It must be started from `main` after staging results are reviewed and release approval is explicit. A merge to `main` does not deploy to Cloudflare or publish a stable Android/Windows release.

R2 backup/restore remains deferred. Do not create an R2 bucket or add an R2 binding for this release.
