# OceanHub 3.0 — NEXUS implementation plan

**Status:** approved to proceed by the product owner on 2026-11-19.  
**Canonical product:** OceanHub, backed by the existing Cloudflare Worker `oceanhud`.  
**Repository:** `companygamerstudios/OceanHubServer`.  
**Product rule:** additive evolution; do not remove or silently disable existing capabilities, aliases, routes, auth flows, payment flows, providers, or admin controls.

## 1. Delivery strategy

Deliver vertical slices through feature branches and draft Pull Requests. Each slice must:
1. Inspect the current implementation and its route/data contracts.
2. Write or update its specification and task checklist before editing code.
3. Implement the smallest end-to-end slice.
4. Add regression and behavior tests, including authorization and privacy.
5. Run the repository's `npm run check:syntax`, `npm test`, and appropriate Wrangler dry-run.
6. Review the diff for deleted routes/capabilities and accidental production/config changes.
7. Publish a preview only when the Preview is isolated from production data and secrets.
8. Keep production untouched until a separate release review and explicit deployment authorization.

## 2. Runtime and architecture decisions

- Keep the current Worker `oceanhud` and its existing bindings as the production backend.
- Keep the website and all existing routes as a first-class product; the app is an additional client.
- Do not create a second Worker or require R2.
- Use the existing KV/DO architecture for current web features. Any test/Preview data resource must be separate from production; never point a PR Preview at production KV.
- Use the current code's module format and pinned Node/Wrangler versions. Do not upgrade dependencies incidentally.
- The independent app uses Tauri 2 with a packaged Ocean Glass UI. The first validated frontend scaffold is TypeScript + Vite (no React dependency in this shell); future framework changes require a separate compatibility reason.
- The native app consumes explicit, versioned JSON contracts under `/api/v1/app/*` when existing APIs are not suitable. It must not scrape HTML pages as APIs.
- Reuse the existing identity, 2FA and authorization logic where safe. Prove mobile/WebView sign-in, callback, refresh, session revocation and secure storage before enabling sensitive native flows.
- Windows packages need a verified signing/update chain. Android APKs keep the same package identity and signing certificate; Android's system installer performs the final user-confirmed install.
- GitHub Releases host signed native artifacts. `/download` links only to published, immutable, verified assets. Never expose placeholder/fake downloads.
- A temporary version-check outage does not make a version obsolete. Preserve the last valid policy and provide retry/support.
- Marketplace payments remain disabled until the complete order/payment/webhook/idempotency/refund/reconciliation path has passed Sandbox and security review.
- Air Flow modes, providers, tools and model choices remain additive; no existing capability may be removed as a cleanup.

## 3. Workstreams and acceptance gates

### W0 — Safe foundations and release engineering
**Purpose:** make branch validation reliable before product changes.
- [x] Fix the initial app-shell CI failure and pass syntax, regression tests, TypeScript/Vite build and local Wrangler dry-run on PR #21 without changing production behavior.
- [ ] Establish safe Worker Preview configuration; use isolated Durable Object state and never attach the production `STATS` KV namespace to PR Previews.
- [ ] Document which public Preview routes can be tested without account data and which require a dedicated non-production data namespace/secrets.
- [ ] Record a route-compatibility snapshot and smoke tests for critical existing route families.
- [ ] Add a no-production-deploy guard to feature-branch workflows where needed.

**Gate:** all checks pass; Preview build has a URL; public download/version routes work; no Preview can write production KV/DO state.

### W1 — OceanHub Everywhere (PWA and native app)
- [ ] Stabilize `/download`, manifest, icon, Service Worker and public version manifest.
- [ ] Test PWA installation on current supported Windows browsers and Android Chrome.
- [~] Implement the first native-client update-policy slice: SemVer/prerelease comparison, minimum-version decision, cached public policy and offline fallback; allowed artifact hosts, hash/signature verification and the native install/retry flow remain pending.
- [ ] Scaffold a separate Tauri 2 client with its own Ocean Glass UI and tests; keep web UI/routes untouched.
- [ ] Define and test the mobile authentication proof-of-concept before consuming protected APIs.
- [ ] Produce and sign Windows installer and Android APK in CI only after signing-key custody is configured.
- [ ] Publish immutable GitHub Release assets and connect verified metadata to `/download`.

**Gate:** installed web/PWA path is truthful and secure; native install/update can be tested from clean installs and previous releases; no secrets/signing private keys in git or logs.

### W2 — Ocean Social Evolution
- [ ] Map existing Feed, Friends, Crews, Messages, notifications, blocks, presence and typing contracts.
- [ ] Add per-account privacy preferences with secure defaults and backward-compatible migration.
- [ ] Add message-request workflow that respects recipient settings, blocks, rate limits and existing friendships.
- [ ] Add author-controlled pinned content with ownership checks.
- [ ] Improve report/moderation review and audit without deleting existing moderation history.
- [ ] Keep existing routes/aliases and test friend presence, invisible mode, message ownership and notifications.

**Gate:** privacy and block rules enforced server-side across all new and existing operations.

### W3 — Ocean Creator Ecosystem
- [ ] Extend Creator Studio with public creator identity, project pages and owner-authored updates.
- [ ] Add safe discovery, pagination and links into Feed, Events, Arena and Market where applicable.
- [ ] Add URL/content validation, private draft handling, reports and moderation.
- [ ] Keep existing Creator Studio/profile routes and ownership checks.

**Gate:** public discovery never exposes drafts or private creator data; project updates require server-verified ownership.

### W4 — Air Flow 3.0
- [ ] Inventory every existing Air Flow mode, provider, endpoint, file limit and permission.
- [ ] Add private projects and conversation organization over current conversation records.
- [ ] Add a private file library with explicit retention, MIME/size limits and deletion.
- [ ] Add Agent task records with status/progress/cancel and human approval before external, irreversible or account-impacting actions.
- [ ] Add model comparison with provider transparency and partial-error handling.
- [ ] Extend tests to prove no existing mode/provider is removed.

**Gate:** account isolation, file controls, task cancellation and confirmation are tested; current modes/providers remain available.

### W5 — Ocean Market
- [ ] Map the existing moderated catalogue separately from the existing Shop/PayPal checkout.
- [ ] Define item listing, order snapshot, actor permissions and order event history.
- [ ] Implement order state transitions, buyer/seller views, support/dispute links and verified-order reviews.
- [ ] Verify webhook signature, idempotency, replay behavior, reprocessing, refunds and reconciliation in PayPal Sandbox.
- [ ] Preserve the current Shop/subscription/seller system.

**Gate:** no Marketplace money flow is enabled until full Sandbox and security checks pass; client state cannot mark an order paid.

### W6 — Ocean Command 2.0
- [ ] Map current Ocean Command, Staff, Admin, support, sellers, verification and report controls.
- [ ] Add metrics from real, attributable sources with freshness/availability markers.
- [ ] Add unified moderation queues, paginated audit and service health.
- [ ] Enforce role + 2FA gates at every mutating endpoint; redact secrets and personal identifiers.
- [ ] Preserve existing admin routes and controls.

**Gate:** admin/no-admin/2FA matrix passes; no fake metrics or secret material exposed.

### W7 — OceanHub Home 3.0
- [ ] Build a personal dashboard using safe, existing sources: friends presence, notifications, events, approved creator projects, feed and subscription/account state.
- [ ] Add personalized quick links with safe defaults.
- [ ] Add recommendations only from available, non-sensitive signals; explain unavailable or empty states.
- [ ] Avoid exposing purchase activity, email, IP, private events or private project data to other users.
- [ ] Preserve existing account tools and legacy Home destinations.

**Gate:** each widget is authorized, real-data-backed and independently fault tolerant; all existing Home/sidebar routes remain accessible.

### W8 — Final compatibility and release
- [ ] Run route/method/auth inventory comparison against the Phase 0 baseline.
- [ ] Run regression tests, Wrangler dry-run, Preview tests and security checks.
- [ ] Validate PWA, Windows and Android builds and update-from-previous-version flows.
- [ ] Review accessibility, mobile layouts, performance and error handling.
- [ ] Prepare release notes, rollback plan and manual go/no-go checklist.
- [ ] Deploy only after the product owner explicitly authorizes the production release.

## 4. First implementation increments

1. **Download/Preview validation:** repair PR #19's Wrangler Preview configuration without attaching production KV. Test only public download/version routes first.
2. **App contract baseline:** specify auth proof-of-concept and minimal health/version/session contracts; no password/token storage design is assumed until tested.
3. **Tauri proof:** the shell and public version/status screen are implemented in PR #21; the frontend build and Worker regression/dry-run gates pass. Native Windows/Android packaging checks and mobile authentication remain pending.
4. **First product slice:** begin Social/Creator after contracts and data model review, then Air Flow, Market, Command, and Home in dependency order.

## 5. Definition of done for each PR

- Scope is explicit and tied to one or more spec requirements.
- No unexplained deletion or rename of existing routes, exports, tools, providers, roles or user data.
- Every mutating operation has backend authentication, authorization, ownership, bounds and rate limits appropriate to its risk.
- Tests include success, invalid input, missing binding/provider, unauthorized access and regression paths as relevant.
- CI is green; changed Worker config passes dry-run; Preview isolation is documented.
- PR describes exactly what changed and what remains unimplemented.
- No production deploy, secret rotation, Cloudflare resource mutation or release publication is implied by a green CI job.

## 6. Known starting constraints

- The current main branch has a large single Worker module plus `ocean-suite.js`; change the smallest surface possible.
- The current `/home-data` includes purchase-derived activity data. Home 3.0 must not reuse that field as public social activity; replace or separate it with a least-privilege, privacy-reviewed contract.
- `/home` currently shows key-count/value information and currency conversion. Preserve useful existing account functionality while separating Staff-only/system-sensitive metrics from ordinary users.
- Current app authentication is cookie/session-oriented; Tauri origin and OAuth behavior are not yet proven.
- Cloudflare Worker `oceanhud` currently has production KV and a SQLite Durable Object binding. PR Previews must not reuse production KV.
- The current Cloudflare Worker Build Preview command is `npx wrangler preview`; the Wrangler config currently lacks a `previews` block. Add Preview bindings deliberately and test.
- Cloudflare runtime settings currently have no observability configuration reported by the account API; this is a production-readiness follow-up, not a reason to change production settings during feature work.
