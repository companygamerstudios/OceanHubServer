import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_CLIENT_VERSION,
  VERSION_POLICY_CACHE_KEY,
  VERSION_POLICY_ENDPOINT,
  checkVersionPolicy,
  compareSemVer,
  getVersionDecision
} from "../apps/oceanhub-app/src/version-policy.js";

const policy = {
  name: "OceanHub",
  version: "3.0.0-preview.2",
  minimumSupportedVersion: "3.0.0-preview.1",
  channel: "preview",
  updateRequired: true,
  downloadUrl: "/download",
  releaseNotes: "Actualización de prueba"
};

function makeResponse(body, { ok = true, contentType = "application/json; charset=utf-8" } = {}) {
  return {
    ok,
    headers: { get: name => name.toLowerCase() === "content-type" ? contentType : null },
    json: async () => body
  };
}

function makeStorage(initial) {
  const values = new Map(initial ? [[VERSION_POLICY_CACHE_KEY, JSON.stringify(initial)]] : []);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    read: key => values.get(key) ?? null
  };
}

test("SemVer compara versiones finales y prereleases según precedencia", () => {
  assert.equal(compareSemVer("3.0.0-preview.2", "3.0.0-preview.10"), -1);
  assert.equal(compareSemVer("3.0.0-preview.2", "3.0.0"), -1);
  assert.equal(compareSemVer("3.1.0", "3.0.99"), 1);
  assert.equal(compareSemVer("invalid", "3.0.0"), null);
});

test("la política diferencia versión actual, opcional y obligatoria", () => {
  assert.equal(getVersionDecision(APP_CLIENT_VERSION, {
    ...policy,
    version: APP_CLIENT_VERSION,
    minimumSupportedVersion: APP_CLIENT_VERSION
  }), "current");
  assert.equal(getVersionDecision("3.0.0-preview.1", policy), "available");
  assert.equal(getVersionDecision("3.0.0-preview.0", policy), "required");
});

test("consulta el manifiesto sin cookies, tokens ni caché HTTP", async () => {
  const storage = makeStorage();
  let requestUrl = "";
  let requestOptions;
  const result = await checkVersionPolicy({
    clientVersion: APP_CLIENT_VERSION,
    storage,
    fetcher: async (url, options) => {
      requestUrl = String(url);
      requestOptions = options;
      return makeResponse({ ...policy, version: APP_CLIENT_VERSION, minimumSupportedVersion: APP_CLIENT_VERSION });
    }
  });
  assert.equal(requestUrl, VERSION_POLICY_ENDPOINT);
  assert.equal(requestOptions.credentials, "omit");
  assert.equal(requestOptions.cache, "no-store");
  assert.equal(requestOptions.redirect, "error");
  assert.deepEqual(requestOptions.headers, { Accept: "application/json" });
  assert.equal(result.connectivity, "online");
  assert.equal(result.decision, "current");
  assert.ok(storage.read(VERSION_POLICY_CACHE_KEY));
});

test("una caída de red conserva la última política y no inventa una actualización obligatoria", async () => {
  const cached = { policy: { ...policy, version: APP_CLIENT_VERSION, minimumSupportedVersion: APP_CLIENT_VERSION }, checkedAt: "2026-11-19T00:00:00.000Z" };
  const storage = makeStorage(cached);
  const result = await checkVersionPolicy({
    clientVersion: APP_CLIENT_VERSION,
    storage,
    fetcher: async () => { throw new Error("offline"); }
  });
  assert.equal(result.connectivity, "offline");
  assert.equal(result.decision, "current");
  assert.equal(result.checkedAt, cached.checkedAt);
  assert.equal(result.policy.version, APP_CLIENT_VERSION);
});

test("la caída de red conserva una política obligatoria previamente válida", async () => {
  const cachedPolicy = { ...policy, version: "3.1.0", minimumSupportedVersion: "3.0.2" };
  const storage = makeStorage({ policy: cachedPolicy, checkedAt: "2026-11-19T00:00:00.000Z" });
  const result = await checkVersionPolicy({
    clientVersion: APP_CLIENT_VERSION,
    storage,
    fetcher: async () => { throw new Error("offline"); }
  });
  assert.equal(result.connectivity, "offline");
  assert.equal(result.decision, "required");
  assert.equal(result.policy.minimumSupportedVersion, "3.0.2");
});

test("rechaza políticas inválidas y no persiste HTML de error como versión", async () => {
  const storage = makeStorage();
  const result = await checkVersionPolicy({
    storage,
    fetcher: async () => makeResponse({ version: "not-a-version" })
  });
  assert.equal(result.connectivity, "offline");
  assert.equal(result.decision, "unknown");
  assert.equal(result.policy, null);
  assert.equal(storage.read(VERSION_POLICY_CACHE_KEY), null);
});

test("OceanHub 3.0.1 marca 3.0.0 como actualización obligatoria", () => {
  assert.equal(APP_CLIENT_VERSION, "3.0.1");
  const stablePolicy = {
    name: "OceanHub",
    version: "3.0.1",
    minimumSupportedVersion: "3.0.1",
    channel: "stable",
    downloadUrl: "/download",
    releaseNotes: "OceanHub 3.0.1"
  };
  assert.equal(getVersionDecision("3.0.0", stablePolicy), "required");
  assert.equal(getVersionDecision("3.0.1", stablePolicy), "current");
});