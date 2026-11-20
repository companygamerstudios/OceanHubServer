import test from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { readFile } from "node:fs/promises";

import { PUSH_CLIENT_JS } from "../push-client.js";

test("the injected push client script is syntactically valid JavaScript", () => {
  assert.doesNotThrow(() => new Script(PUSH_CLIENT_JS));
});

test("push client unregisters only this device before following the logout link", () => {
  assert.match(PUSH_CLIENT_JS, /function bindLogoutCleanup\(\)/);
  assert.match(PUSH_CLIENT_JS, /destination\.pathname !== "\/logout"/);
  assert.match(PUSH_CLIENT_JS, /\/api\/push\/unregister/);
  assert.match(PUSH_CLIENT_JS, /keepalive: true/);
  assert.match(PUSH_CLIENT_JS, /plugin:fcm\\|delete_token/);
  assert.match(PUSH_CLIENT_JS, /messagingModule\.deleteToken\(messaging\)/);
  assert.match(PUSH_CLIENT_JS, /setLocalFlag\("oh_push_android_enabled", false\)/);
  assert.match(PUSH_CLIENT_JS, /setLocalFlag\("oh_push_windows_enabled", false\)/);
  assert.match(PUSH_CLIENT_JS, /location\.assign\(destination\.href\)/);
});

test("Windows push client monitors the live connection and reconnects after failure", () => {
  assert.match(PUSH_CLIENT_JS, /heartbeatTimer = setInterval/);
  assert.match(PUSH_CLIENT_JS, /lastPongAt/);
  assert.match(PUSH_CLIENT_JS, /heartbeat timeout/);
});


test("Android FCM permission handling accepts the plugin's granted string state", () => {
  assert.match(PUSH_CLIENT_JS, /permission === "granted"/);
  assert.match(PUSH_CLIENT_JS, /plugin:fcm\\|request_permissions/);
});

test("Android and Windows apps poll persisted notifications while enabled and foreground-capable", () => {
  assert.match(PUSH_CLIENT_JS, /fetch\("\/api\/notifications"/);
  assert.match(PUSH_CLIENT_JS, /setInterval\(pollForegroundNotifications, 15000\)/);
  assert.match(PUSH_CLIENT_JS, /showForegroundNotification/);
  assert.match(PUSH_CLIENT_JS, /Tienes un nuevo mensaje privado/);
  assert.match(PUSH_CLIENT_JS, /socket\.readyState === WebSocket\.OPEN/);
});

test("remote native capabilities are restricted to the official OceanHub Worker origin", async () => {
  const base = new URL("../apps/oceanhub-app/src-tauri/capabilities/", import.meta.url);
  const android = JSON.parse(await readFile(new URL("remote-android.json", base), "utf8"));
  const windows = JSON.parse(await readFile(new URL("remote-windows.json", base), "utf8"));
  const trustedOrigin = ["https://oceanhud.yoelenmanuelzorrilla.workers.dev/**"];

  assert.deepEqual(android.remote.urls, trustedOrigin);
  assert.deepEqual(windows.remote.urls, trustedOrigin);
  assert.deepEqual(android.platforms, ["android"]);
  assert.deepEqual(windows.platforms, ["windows"]);
  assert.ok(android.permissions.includes("fcm:default"));
  assert.ok(android.permissions.includes("notification:default"));
  assert.ok(windows.permissions.includes("notification:default"));
  assert.ok(windows.permissions.includes("autostart:allow-enable"));
  assert.ok(!android.permissions.some(permission => permission.startsWith("shell:")));
  assert.ok(!windows.permissions.some(permission => permission.startsWith("shell:")));
});

test("Windows Durable Object source responds to the client's ping heartbeat", async () => {
  const source = await readFile(new URL("../OceanHub_SECURITY_PATCHED_FINAL_v18.js", import.meta.url), "utf8");
  assert.match(source, /webSocketMessage\(socket, message\)/);
  assert.match(source, /payload\?\.type === 'ping'/);
  assert.match(source, /type: 'pong'/);
});
