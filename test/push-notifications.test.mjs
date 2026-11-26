import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import {
  decryptPushToken,
  encryptPushToken,
  handleFirebaseMessagingServiceWorker,
  handlePushApi,
  handlePushSocket,
  sanitizePushNotification,
  sendPushToUser,
  validatePushRegistration
} from "../push-notifications.js";

function createKV() {
  const values = new Map();
  return {
    values,
    async get(key, type) {
      const value = values.get(key);
      if (value === undefined) return null;
      if (type === "json") {
        try { return JSON.parse(value); } catch { return null; }
      }
      return value;
    },
    async put(key, value) { values.set(key, String(value)); },
    async delete(key) { values.delete(key); }
  };
}

function makeRequest(path, { method = "GET", body, origin = "https://oceanhub.test" } = {}) {
  return new Request("https://oceanhub.test" + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(origin ? { Origin: origin } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

const EMAIL = "push-test@example.invalid";
const ENCRYPTION_SECRET = "test-only-secret-with-at-least-32-characters-not-production";


test("push payloads never include private-message previews", () => {
  const privateMessage = sanitizePushNotification({
    type: "dm",
    title: "Mensaje de @yoel",
    body: "texto confidencial que no debe ir al lock screen",
    href: "/messages/yoel"
  });
  assert.equal(privateMessage.body, "Tienes un nuevo mensaje privado. Abre OceanHub para leerlo.");
  assert.equal(privateMessage.href, "/messages/yoel");

  const social = sanitizePushNotification({
    type: "friend_request",
    title: "Solicitud de amistad",
    body: "Tienes una solicitud de amistad",
    href: "/friends"
  });
  assert.equal(social.body, "Tienes una solicitud de amistad");
});

test("push registration accepts only supported platforms and valid opaque tokens", () => {
  assert.deepEqual(validatePushRegistration({ platform: "android", token: "a".repeat(64) }), {
    ok: true, platform: "android", token: "a".repeat(64)
  });
  assert.equal(validatePushRegistration({ platform: "web", token: "w".repeat(64) }).ok, true);
  assert.equal(validatePushRegistration({ platform: "windows", token: "f".repeat(64) }).ok, true);
  assert.equal(validatePushRegistration({ platform: "ios", token: "i".repeat(64) }).ok, false);
  assert.equal(validatePushRegistration({ platform: "android", token: "short" }).ok, false);
  assert.equal(validatePushRegistration({ platform: "android", token: "a".repeat(64) + "\n" }).ok, false);
  assert.equal(validatePushRegistration(null).ok, false);
});

test("push tokens are encrypted at rest and can be decrypted with the separate secret", async () => {
  const env = { PUSH_TOKEN_ENCRYPTION_SECRET: ENCRYPTION_SECRET };
  const token = "fcm-registration-token-" + "x".repeat(80);
  const encrypted = await encryptPushToken(env, token);
  assert.notEqual(encrypted.ciphertext, token);
  assert.equal(JSON.stringify(encrypted).includes(token), false);
  assert.equal(await decryptPushToken(env, encrypted), token);
  await assert.rejects(() => decryptPushToken(
    { PUSH_TOKEN_ENCRYPTION_SECRET: "different-secret-with-at-least-32-characters" },
    encrypted
  ));
});


test("token encryption refuses reuse of an existing OceanHub security secret", async () => {
  await assert.rejects(() => encryptPushToken({
    PUSH_TOKEN_ENCRYPTION_SECRET: ENCRYPTION_SECRET,
    HMAC_SECRET_CURRENT: ENCRYPTION_SECRET
  }, "fcm-registration-token-" + "x".repeat(80)));
});

test("device registration stores an encrypted record and unregister removes it", async () => {
  const STATS = createKV();
  const env = { STATS, PUSH_TOKEN_ENCRYPTION_SECRET: ENCRYPTION_SECRET };
  const token = "android-" + "a".repeat(80);
  const register = await handlePushApi(
    env,
    makeRequest("/api/push/register", { method: "POST", body: { platform: "android", token } }),
    EMAIL
  );
  assert.equal(register.status, 200);
  assert.equal((await register.json()).ok, true);

  const stored = [...STATS.values.entries()].find(([key]) => key.startsWith("oh_push_devices_"));
  assert.ok(stored, "device record was persisted");
  assert.equal(stored[1].includes(token), false, "plaintext device token is not stored");
  const rows = JSON.parse(stored[1]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].platform, "android");
  assert.equal(await decryptPushToken(env, rows[0].token), token);

  const remove = await handlePushApi(
    env,
    makeRequest("/api/push/unregister", { method: "POST", body: { platform: "android", token } }),
    EMAIL
  );
  assert.equal(remove.status, 200);
  assert.deepEqual(JSON.parse(stored[1]), rows, "previous serialized snapshot remains immutable");
  const after = await STATS.get(stored[0], "json");
  assert.deepEqual(after, []);
});

test("Windows devices can register independently without an FCM token", async () => {
  const STATS = createKV();
  const env = { STATS, PUSH_TOKEN_ENCRYPTION_SECRET: ENCRYPTION_SECRET };
  const deviceId = "b".repeat(64);
  const response = await handlePushApi(
    env,
    makeRequest("/api/push/register", { method: "POST", body: { platform: "windows", token: deviceId } }),
    EMAIL
  );
  assert.equal(response.status, 200);
  const stored = [...STATS.values.entries()].find(([key]) => key.startsWith("oh_push_devices_"));
  const rows = JSON.parse(stored[1]);
  assert.equal(rows[0].platform, "windows");
  assert.equal(await decryptPushToken(env, rows[0].token), deviceId);
});

test("notification preferences default to enabled and are persisted per account", async () => {
  const env = { STATS: createKV() };
  const defaults = await handlePushApi(env, makeRequest("/api/push/preferences"), EMAIL);
  assert.deepEqual((await defaults.json()).preferences, {
    messages: true, social: true, system: true
  });

  const update = await handlePushApi(
    env,
    makeRequest("/api/push/preferences", {
      method: "POST",
      body: { messages: false, social: false }
    }),
    EMAIL
  );
  assert.equal(update.status, 200);
  assert.deepEqual((await update.json()).preferences, {
    messages: false, social: false, system: true
  });
});

test("push API rejects requests from a different Origin", async () => {
  const env = { STATS: createKV(), PUSH_TOKEN_ENCRYPTION_SECRET: ENCRYPTION_SECRET };
  const response = await handlePushApi(
    env,
    makeRequest("/api/push/register", {
      method: "POST",
      body: { platform: "android", token: "a".repeat(64) },
      origin: "https://attacker.invalid"
    }),
    EMAIL
  );
  assert.equal(response.status, 403);
});

test("web configuration exposes only the public Firebase config and VAPID key", async () => {
  const config = {
    apiKey: "public-api-key",
    authDomain: "oceanhub-91e40.firebaseapp.com",
    projectId: "oceanhub-91e40",
    messagingSenderId: "496873954616",
    appId: "1:496873954616:web:75966f9a66ecf83d7435cd"
  };
  const env = {
    STATS: createKV(),
    FIREBASE_WEB_CONFIG_JSON: JSON.stringify(config),
    FIREBASE_WEB_VAPID_KEY: "public-vapid-key"
  };
  const response = await handlePushApi(env, makeRequest("/api/push/config"), EMAIL);
  const body = await response.json();
  assert.equal(body.webEnabled, true);
  assert.deepEqual(body.firebaseConfig, config);
  assert.equal(body.vapidKey, "public-vapid-key");
  assert.equal("private_key" in body, false);
  assert.equal("serviceAccount" in body, false);
});

test("Firebase service worker is same-origin scoped and uses current SDK compat bundles", async () => {
  const response = handleFirebaseMessagingServiceWorker({
    FIREBASE_WEB_CONFIG_JSON: JSON.stringify({
      apiKey: "public-api-key",
      authDomain: "oceanhub-91e40.firebaseapp.com",
      projectId: "oceanhub-91e40",
      messagingSenderId: "496873954616",
      appId: "1:496873954616:web:75966f9a66ecf83d7435cd"
    })
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Service-Worker-Allowed"), "/");
  assert.match(await response.text(), /firebasejs\/13\.4\.0\/firebase-messaging-compat\.js/);
});


test("Windows push socket fails closed when its Durable Object binding is unavailable", async () => {
  const request = new Request("https://oceanhub.test/api/push/socket", {
    headers: { Origin: "https://oceanhub.test", Upgrade: "websocket" }
  });
  const response = await handlePushSocket({}, request, EMAIL);
  assert.equal(response.status, 503);
});

test("Windows push socket rejects missing or cross-origin Origin headers", async () => {
  const crossOrigin = await handlePushSocket(
    {},
    makeRequest("/api/push/socket", { origin: "https://attacker.invalid" }),
    EMAIL
  );
  assert.equal(crossOrigin.status, 403);

  const missingOrigin = await handlePushSocket(
    {},
    makeRequest("/api/push/socket", { origin: null }),
    EMAIL
  );
  assert.equal(missingOrigin.status, 403);
});

test("Web push config fails closed for a different Firebase project", async () => {
  const response = await handlePushApi({
    STATS: createKV(),
    FIREBASE_WEB_CONFIG_JSON: JSON.stringify({
      apiKey: "public-api-key",
      authDomain: "another-project.firebaseapp.com",
      projectId: "another-project",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    }),
    FIREBASE_WEB_VAPID_KEY: "public-vapid-key"
  }, makeRequest("/api/push/config"), EMAIL);
  const body = await response.json();
  assert.equal(body.webEnabled, false);
  assert.equal(body.firebaseConfig, null);
  assert.equal(body.vapidKey, null);
});

test("missing Firebase web config fails closed without returning a broken service worker", async () => {
  const response = handleFirebaseMessagingServiceWorker({});
  assert.equal(response.status, 503);
});


test("Windows push dispatch publishes a sanitized event to the account Durable Object", async () => {
  const STATS = createKV();
  const calls = [];
  const env = {
    STATS,
    PUSH_TOKEN_ENCRYPTION_SECRET: ENCRYPTION_SECRET,
    KV_LOCKER: {
      idFromName(name) { return name; },
      get(id) {
        return {
          async fetch(input, init) {
            calls.push({ id, url: String(input), init });
            return Response.json({ ok: true, delivered: 1 });
          }
        };
      }
    }
  };
  await handlePushApi(
    env,
    makeRequest("/api/push/register", {
      method: "POST",
      body: { platform: "windows", token: "c".repeat(64) }
    }),
    EMAIL
  );

  await sendPushToUser(env, EMAIL, {
    type: "dm",
    title: "Mensaje de @yoel",
    body: "este texto privado no debe salir al aviso",
    href: "/messages/yoel"
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /realtime\/push\/publish$/);
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.title, "Mensaje de @yoel");
  assert.equal(payload.body, "Tienes un nuevo mensaje privado. Abre OceanHub para leerlo.");
  assert.equal(payload.href, "/messages/yoel");
});

test("the Worker wires persisted social and private-message notifications into push dispatch", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../OceanHub_SECURITY_PATCHED_FINAL_v18.js", import.meta.url), "utf8");
  assert.match(source, /import \{ handlePushApi, handlePushSocket, handleFirebaseMessagingServiceWorker, sendPushToUser \} from '\.\/push-notifications\.js'/);
  assert.match(source, /if \(path\.startsWith\('\/api\/push\/'\)\)/);
  assert.match(source, /await sendPushToUser\(env, toEmail, item, withKVLock\)/);
  assert.match(source, /socialPushNotif\(env, peer\.email,[\s\S]{0,400}type: 'dm'/);
});
