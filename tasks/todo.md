# OceanHub 3.0 — implementation checklist

Legend: `[x]` verified complete, `[~]` in progress, `[ ]` pending.

## Foundations / W0
- [x] Inspect repository, main Worker entrypoint, Ocean Suite module, package scripts and Wrangler config.
- [x] Inspect existing route families and document a Phase 0 static compatibility baseline.
- [x] Add seven functional specs and capability/dependency map to PR #20.
- [x] Fix the regex syntax issue in `test/download-center.test.mjs` on PR #19.
- [x] Verify GitHub Quality gates on the corrected PR #19 commit.
- [ ] Correct Cloudflare Preview config without production KV reuse.
- [ ] Confirm a successful Cloudflare Preview build and exercise the public download/version routes.
- [ ] Add broader route/method/auth regression tests for high-priority existing paths.
- [ ] Decide whether a dedicated non-production KV namespace and Preview secrets are needed for authenticated feature testing.

## W1 — Everywhere
- [x] Implement initial PWA download center, manifest, icon, service worker and public version endpoint on PR #19.
- [x] Implement initial HTML version monitor for authenticated pages.
- [ ] Add robust update policy fields and failure/outage behavior.
- [ ] Test installation on supported Edge/Chrome desktop and Android Chrome.
- [ ] Scaffold Tauri 2 app under `apps/oceanhub-app/`.
- [ ] Build the first packaged shell for Windows and Android.
- [ ] Prove app authentication, 2FA, logout and session revocation.
- [ ] Configure signing-key custody outside repository/Cloudflare source config.
- [ ] Publish verified native artifacts as GitHub Release assets and link them from `/download`.

## W2 — Social Evolution
- [ ] Map current privacy, blocks, friends, messaging, notifications and moderation data models.
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
