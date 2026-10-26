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

## Community, creator and verification tools

The authenticated community shell and main sidebar include these features:

- **Verification:** users submit requests at `/verification/request`; administrators open the **Panel de verificación** from `/admin` or directly at `/admin/social`. Approvals and removals record the operator, timestamp, target and decision reason. Pending requests and the audit history live at `/admin/verification-requests` and `/admin/verification-audit`.
- **Ocean Identity:** profile tagline, biography, favorite game and optional creator link at `/profile/edit`.
- **Game Party:** public or private parties; private parties can only be joined by the host or invited accounts.
- **Ocean Seasons:** lifetime Ocean XP is retained; new XP awards also count toward the current UTC quarter.
- **Ocean Creator Studio:** create and remove your own public project cards at `/creator-studio`.
- **Ocean Arena:** create tournaments, set a start time and participant cap, and join/leave or cancel as the organizer at `/arena`.
- **Air Flow Studio:** save private prompt drafts at `/air-flow-studio`, copy a draft and open the existing `/air-flow` assistant. It is an add-on; it does not replace the Air Flow engine or remove modes/providers.

All community pages require an authenticated session, and administrator verification pages require the admin role. These additions use the existing Worker storage binding; they do not require a new Worker or an external R2 bucket.

## Production deployment

Production publishing is handled automatically by the GitHub Actions workflow **Implementar comando**.

- Every commit pushed to `main` starts the workflow.
- GitHub checks JavaScript syntax, runs the security smoke tests, validates the production package, and runs the preflight.
- Only if all checks pass does the workflow publish the `oceanhud` Worker using `wrangler.production_v18.jsonc`.
- You can also start it from GitHub: **Actions → Implementar comando → Run workflow**.

You no longer need to run `npm run deploy:production` from your laptop for routine releases. That script remains as a manual fallback for an authorized local operator.

Before this automation can publish, add two repository Actions secrets in **Settings → Secrets and variables → Actions**:
`CLOUDFLARE_API_TOKEN` (a Cloudflare API token scoped to the required Workers deployment permissions) and `CLOUDFLARE_ACCOUNT_ID`. Never put either value in source files or chat. The workflow stops before deployment if they are missing or if the production preflight fails.

This workflow does not deploy code from feature branches or pull requests. Merge the change into `main`; it then runs the checks and deployment automatically.

This runs the preflight and then deploys with `wrangler.production_v18.jsonc`. The preflight checks the required secret names in Cloudflare using Wrangler's supported `secrets.required` configuration field; it cannot read secret values and therefore cannot certify their length, uniqueness or correctness. Those checks require secure runtime verification or a manual secret manager review. This field contains names only; never put secret values in this repository. See the [official Wrangler configuration documentation](https://developers.cloudflare.com/workers/wrangler/configuration/).

No staging Worker or KV namespace is created by this repository. Do not deploy staging until a separate Worker, independent KV namespace, separate Durable Object storage and PayPal Sandbox credentials have been created and tested. The separate `quality.yml` workflow only validates changes; production publishing is performed by `Implementar comando` after a push to `main`.

The production config currently retains `keep_vars: true`: per Cloudflare's [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/configuration/), that preserves dashboard variables not reconciled by the deployment. This can help avoid accidental deletion of dashboard-managed variables, but it also allows configuration drift. Do not remove it until the dashboard variables have been inventoried and the config is confirmed as the source of truth.

## Security remediation pass 1

This branch hardens random suffixes, HSTS, disables the test webhook by default, bounds CSV and Air Flow upload size/MIME, improves the Stable Horde failure message without logging its response body, and discloses third-party AI processing in the UI and privacy page. Automated tests are structural smoke tests, not a penetration test or certification.

The Worker code can validate encryption-secret length and separation when those secrets are used, but Cloudflare's secret-list command exposes only names, not values. Do not copy TOTP seeds or API/encryption keys into chat, logs, issues or screenshots. Rotate credentials through their respective provider dashboards when exposure is suspected.

Before production release, manually complete and record: rotate/rebind admin TOTP, safely inspect the admin KV record, verify three encryption secrets are at least 32 characters and distinct, store recovery copies out-of-band, rotate any exposed provider credentials, verify current/previous HMAC rotation, convert sensitive dashboard variables to Secrets, inspect secret/variable name collisions in Cloudflare, decide whether AI prompt forwarding to Stable Horde is approved, configure Cloudflare Access/IP restriction, verify OAuth 2FA/redirects/session revocation/CSRF and PayPal webhook signature/idempotency with real Sandbox events, activate logs and 5xx/provider/webhook alerts, create and restore an encrypted off-site backup, test email DNS and inbox delivery, test mobile/accessibility, and arrange an external penetration test. Do not treat the CI tests as a substitute for these operations.
