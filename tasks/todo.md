# OceanHub 3.0 — implementation checklist

Legend: `[x]` verified complete, `[~]` in progress, `[ ]` pending.

## Foundations / W0
- [x] Inspect repository, main Worker entrypoint, Ocean Suite module, package scripts and Wrangler config.
- [x] Inspect existing route families and document a Phase 0 static compatibility baseline.
- [x] Add seven functional specs and capability/dependency map to PR #20.
- [x] Fix the regex syntax issue in `test/download-center.test.mjs` on PR #19.
- [x] Verify GitHub Quality gates on the corrected PR #19 commit.
- [x] Add a Preview configuration with only a per-Preview Durable Object binding; keep the production STATS KV unbound.
- [x] Confirm Cloudflare Preview build success with the explicit production-config path.
- [ ] Perform an external HTTP smoke test against the Preview's public download/version routes; the build produced a URL, but this runtime check is not yet verified.
- [ ] Add broader route/method/auth regression tests for high-priority existing paths.
- [x] Add the PR #21 CI workflow with Worker syntax, all Node regression tests and a local Wrangler dry-run; Push and Pull Request checks passed on commit `7ecf2194be03118e96a49042f5f8df7779960c35`.
- [ ] Decide whether a dedicated non-production KV namespace and Preview-only secrets are needed before testing authenticated feature routes.

## W1 — Everywhere
- [x] Implement initial PWA download center, manifest, icon, service worker and public version endpoint on PR #19.
- [x] Implement initial HTML version monitor for authenticated pages.
- [~] Add robust update policy fields and failure/outage behavior: PR #21 now compares SemVer/prerelease and minimum-supported versions, distinguishes current/optional/required, and preserves the last valid public policy during network failure. Artifact allow-list, hash/signature verification, and real installer/update flows remain pending.
- [ ] Test installation on supported Edge/Chrome desktop and Android Chrome.
- [x] Scaffold a separate Tauri 2 application under `apps/oceanhub-app/` with a responsive Ocean Glass TypeScript/Vite frontend (PR #21; no React dependency in this initial shell).
- [x] Connect the shell to the public version manifest using a credentials-omitted request, metadata-only local cache and strict CORS allow-list for the Tauri and local Vite origins (PR #21).
- [x] Pass app frontend build, Worker syntax, repository regression tests and local Wrangler dry-run in both Push and Pull Request checks (commit `7ecf2194be03118e96a49042f5f8df7779960c35`).
- [ ] Run native Tauri packaging builds for Windows and Android; the current green CI only validates TypeScript/Vite frontend output.
- [ ] Prove app authentication, 2FA, logout and session revocation.
- [ ] Configure signing-key custody outside repository/Cloudflare source config.
- [ ] Publish verified native artifacts as GitHub Release assets and link them from `/download`.

## W2 — Social Evolution
- [~] Map current privacy, blocks, friends, messaging, notifications and moderation data models; the initial route/source review is underway.
- [x] Fix the Friends presence KV fallback key and prevent the API from exposing the literal `invisible` status to other users (PR #22; syntax, regression suite and Wrangler dry-run passed).
- [ ] Add backward-compatible privacy preferences and tests.
- [ ] Implement message requests with block/privacy/rate-limit enforcement.
- [ ] Add pinned user content with ownership controls.
- [ ] Improve moderation queues and audit integration.

## W3 — Creator Ecosystem
- [ ] Review Creator Studio project schema and public/private visibility model.
- [ ] Add project pages and owner-authored update history.
- [ ] Add safe discovery and pagination.
- [ ] Connect public projects to Feed/Events/Arena/Market where appropriate.

## W4 — Air Flow 3.0
- [ ] Complete inventory of existing modes, providers, file handling and conversation persistence.
- [ ] Define private project/conversation relationships and migration strategy.
- [ ] Implement private projects and conversation organization.
- [ ] Implement file library retention/deletion and quotas.
- [ ] Implement Agent Tasks with approval/cancel/status.
- [ ] Implement model comparison with provider transparency.
- [ ] Add regression tests proving no existing modes/providers disappear.

## W5 — Ocean Market
- [ ] Map catalogue and checkout separately.
- [ ] Define order states, immutable item/price snapshot and event history.
- [ ] Implement buyer/seller order screens and tracking.
- [ ] Prove PayPal Sandbox webhooks, idempotency, replay, refunds and reconciliation.
- [ ] Enable transactions only after security review and explicit release gate.

## W6 — Command 2.0
- [ ] Map existing Command Center, moderation, support, verification, sellers and admin permissions.
- [ ] Define real metric sources and freshness indicators.
- [ ] Implement unified moderation queue and audit views.
- [ ] Add service health status and redaction.
- [ ] Test admin/no-admin/2FA authorization for each mutation.

## W7 — Home 3.0
- [ ] Design safe Home data contract; do not expose purchase activity as public social activity.
- [ ] Add friends-presence and notification widgets with ownership/privacy filters.
- [ ] Add events and public Creator project widgets.
- [ ] Add quick-link customization with safe defaults.
- [ ] Replace legacy Home layout without deleting account tools or route destinations.

## W8 — Release and compatibility
- [ ] Run route diff against the Phase 0 inventory.
- [ ] Run full tests, syntax and Wrangler dry-run.
- [ ] Validate PWA/Windows/Android clean install and update paths.
- [ ] Complete accessibility, responsive and performance review.
- [ ] Prepare changelog, rollout and rollback instructions.
- [ ] Obtain explicit authorization before a production deployment.


## Latest app-shell increment
- [x] PR #21 adds the independent Tauri 2 shell, desktop/Android configuration, minimal capability set and responsive Ocean Glass prototype.
- [x] GitHub Action `OceanHub App shell quality` passed the frontend type-check and Vite build on commit `09aebe5e212e73843bcd16b90d3cc04359b0043c`.
- [ ] Confirm the latest Cloudflare branch Preview build for PR #21 and perform external HTTP smoke tests. A Worker Preview is not the native shell; the separate frontend and Worker CI jobs have passed.
- [ ] Native Windows/Android builds, package identity confirmation, authentication PoC, signed packages and update verification remain pending.
