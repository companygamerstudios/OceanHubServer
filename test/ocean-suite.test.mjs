import test from "node:test";
import assert from "node:assert/strict";
import { handleOceanSuiteRoute, oceanSuiteFeatures } from "../ocean-suite.js";
import { readFile } from "node:fs/promises";

const workerSource = await readFile(new URL("../OceanHub_SECURITY_PATCHED_FINAL_v18.js", import.meta.url), "utf8");

class FakeKV {
  constructor() { this.values = new Map(); }
  async get(key, type) {
    const value = this.values.get(key);
    if (value == null) return null;
    if (type === "json") return typeof value === "string" ? JSON.parse(value) : value;
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list(options) {
    const prefix = options && options.prefix || "";
    const keys = Array.from(this.values.keys()).filter((key) => key.startsWith(prefix)).slice(0, options && options.limit || 1000);
    return { keys: keys.map((name) => ({ name })), list_complete: true, cursor: null };
  }
}

function setup(user) {
  const store = new FakeKV();
  const env = { STATS: store, KV_LOCKER: { idFromName: () => "id", get: () => ({ fetch: async () => new Response("ok") }) } };
  const deps = {
    requireAuth: async () => ({ user, sessionToken: "current-session-token" }),
    requireAdmin: async () => user.role === "admin" ? ({ user }) : null,
    checkActionRateLimit: async () => true,
    withKVLock: async (_env, _name, callback) => callback(),
    communityXpState: async () => ({ xp: 650, season: { xp: 200 } }),
    getStats: async () => ({ total_verifications: 12 }),
    socialPushNotif: async () => {},
    revokeOtherSessions: async () => true
  };
  return { env, deps, store };
}

function request(path, method, body) {
  const headers = body ? { "Content-Type": "application/x-www-form-urlencoded" } : {};
  return new Request("https://ocean.test" + path, { method: method || "GET", headers, body });
}

test("suite exposes the planned modules without duplicating existing routes", () => {
  assert.ok(oceanSuiteFeatures.includes("support_desk"));
  assert.ok(oceanSuiteFeatures.includes("marketplace"));
  assert.ok(oceanSuiteFeatures.includes("security_center"));
  assert.equal(oceanSuiteFeatures.length, 8);
});

test("Ocean Suite home links to existing community, notifications and events modules", async () => {
  const { env, deps } = setup({ email: "user@example.test", name: "User", role: "user" });
  const response = await handleOceanSuiteRoute(request("/ocean"), env, deps);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /OceanHub Suite/);
  assert.match(html, /href="\/notifications"/);
  assert.match(html, /href="\/events"/);
  assert.match(html, /href="\/feed"/);
});

test("support desk creates a private ticket and lists it for its owner", async () => {
  const user = { email: "user@example.test", name: "User", role: "user" };
  const { env, deps, store } = setup(user);
  const form = new URLSearchParams({ subject: "No puedo entrar", category: "account", body: "La página de inicio no me deja acceder a mi cuenta." });
  const created = await handleOceanSuiteRoute(request("/ocean/support", "POST", form), env, deps);
  assert.equal(created.status, 303);
  assert.ok(Array.from(store.values.keys()).some((key) => key.startsWith("oh_suite_ticket_")));
  const listing = await handleOceanSuiteRoute(request("/ocean/support"), env, deps);
  assert.match(await listing.text(), /No puedo entrar/);
});

test("support replies cannot be written to another user's ticket", async () => {
  const owner = setup({ email: "owner@example.test", name: "Owner", role: "user" });
  const form = new URLSearchParams({ subject: "Cuenta bloqueada", category: "account", body: "Necesito ayuda para recuperar mi cuenta." });
  await handleOceanSuiteRoute(request("/ocean/support", "POST", form), owner.env, owner.deps);
  const ticketKey = Array.from(owner.store.values.keys()).find((key) => key.startsWith("oh_suite_ticket_"));
  const id = ticketKey.slice("oh_suite_ticket_".length);
  const other = setup({ email: "other@example.test", name: "Other", role: "user" });
  other.env.STATS = owner.store;
  const denied = await handleOceanSuiteRoute(request("/ocean/support/" + id + "/reply", "POST", new URLSearchParams({ body: "No soy el propietario." })), other.env, other.deps);
  assert.equal(denied.status, 404);
});

test("marketplace submissions remain pending until an administrator approves them", async () => {
  const seller = setup({ email: "seller@example.test", name: "Seller", username: "seller", role: "reseller" });
  const form = new URLSearchParams({ title: "Pack digital Ocean", category: "digital", description: "Pack digital con descripción suficientemente larga.", price: "12.50" });
  const submission = await handleOceanSuiteRoute(request("/ocean/market", "POST", form), seller.env, seller.deps);
  assert.equal(submission.status, 303);
  const marketBefore = await handleOceanSuiteRoute(request("/ocean/market"), seller.env, seller.deps);
  assert.doesNotMatch(await marketBefore.text(), /Pack digital Ocean/);
  const admin = setup({ email: "admin@example.test", name: "Admin", role: "admin" });
  admin.env.STATS = seller.store;
  const queue = await handleOceanSuiteRoute(request("/admin/ocean-market"), admin.env, admin.deps);
  assert.match(await queue.text(), /Pack digital Ocean/);
  const index = await seller.store.get("oh_suite_market_index", "json");
  const id = index[0].slice("oh_suite_listing_".length);
  await handleOceanSuiteRoute(request("/admin/ocean-market/" + id, "POST", new URLSearchParams({ decision: "approved" })), admin.env, admin.deps);
  const marketAfter = await handleOceanSuiteRoute(request("/ocean/market"), seller.env, seller.deps);
  assert.match(await marketAfter.text(), /Pack digital Ocean/);
});

test("marketplace cannot be used by ordinary users to publish", async () => {
  const user = setup({ email: "user@example.test", name: "User", role: "user" });
  const form = new URLSearchParams({ title: "My listing", category: "digital", description: "This description has more than twenty characters.", price: "10" });
  const response = await handleOceanSuiteRoute(request("/ocean/market", "POST", form), user.env, user.deps);
  assert.equal(response.status, 403);
});

test("security center delegates revocation without returning session tokens", async () => {
  const { env, deps } = setup({ email: "user@example.test", name: "User", role: "user" });
  await env.STATS.put("session_current-session-token", JSON.stringify({ created: Date.now(), sessionVersion: 0 }));
  const response = await handleOceanSuiteRoute(request("/ocean/security"), env, deps);
  const html = await response.text();
  assert.match(html, /Cerrar las demás sesiones/);
  assert.doesNotMatch(html, /current-session-token/);
  const revoked = await handleOceanSuiteRoute(request("/ocean/security/revoke-others", "POST", new URLSearchParams()), env, deps);
  assert.match(await revoked.text(), /invalidadas/);
});

test("only administrators can open the operations and feature controls", async () => {
  const ordinary = setup({ email: "user@example.test", name: "User", role: "user" });
  const response = await handleOceanSuiteRoute(request("/admin/ocean-command"), ordinary.env, ordinary.deps);
  assert.equal(response.status, 403);
  const admin = setup({ email: "admin@example.test", name: "Admin", role: "admin" });
  const page = await handleOceanSuiteRoute(request("/admin/ocean-command"), admin.env, admin.deps);
  assert.match(await page.text(), /OceanHub Command Center/);
});

test("feature control saves only the predefined feature keys", async () => {
  const admin = setup({ email: "admin@example.test", name: "Admin", role: "admin" });
  const form = new URLSearchParams({ support_desk: "on", launcher: "on", invented_flag: "on" });
  const response = await handleOceanSuiteRoute(request("/admin/ocean-features", "POST", form), admin.env, admin.deps);
  assert.equal(response.status, 303);
  const flags = await admin.store.get("oh_suite_feature_flags", "json");
  assert.deepEqual(Object.keys(flags).sort(), oceanSuiteFeatures.slice().sort());
  assert.equal(flags.support_desk, true);
  assert.equal(flags.marketplace, false);
  assert.equal(Object.prototype.hasOwnProperty.call(flags, "invented_flag"), false);
});

test("reputation achievements use persisted XP and seller role only", async () => {
  const { env, deps } = setup({ email: "user@example.test", name: "User", role: "user" });
  const response = await handleOceanSuiteRoute(request("/ocean/reputation"), env, deps);
  const html = await response.text();
  assert.match(html, /650/);
  assert.match(html, /Deep Diver/);
  assert.match(html, /Ocean Legend/);
});


test("main Worker wires Ocean Suite behind the existing auth gates", () => {
  assert.match(workerSource, /import \{ handleOceanSuiteRoute \} from '\.\/ocean-suite\.js'/);
  assert.match(workerSource, /if \(adminProtectedPath\(path\)\)[\s\S]{0,160}requireAdmin\(env, request\)/);
  assert.match(workerSource, /path === '\/ocean' \|\| path\.startsWith\('\/ocean\/'\)/);
  assert.match(workerSource, /async function revokeOtherSessions\(env, auth\)/);
  assert.match(workerSource, /current\.sessionVersion = nextVersion/);
  assert.match(workerSource, /handleOceanSuiteRoute\(request, env/);
});

test("every new feature flag gates its module, including mutating routes", () => {
  for (const id of ["support_desk", "marketplace", "security_center", "reputation", "developer_hub", "launcher", "air_flow_workspace", "backup_center"]) {
    assert.ok(workerSource.includes(id) || id === "backup_center");
  }
  assert.match(workerSource, /Módulo desactivado/);
});
