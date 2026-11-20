import test from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";

import { PUSH_CLIENT_JS } from "../push-client.js";

test("the injected push client script is syntactically valid JavaScript", () => {
  assert.doesNotThrow(() => new Script(PUSH_CLIENT_JS));
});

test("push client unregisters only this device before following the logout link", () => {
  assert.match(PUSH_CLIENT_JS, /function bindLogoutCleanup\(\)/);
  assert.match(PUSH_CLIENT_JS, /destination\.pathname !== "\/logout"/);
  assert.match(PUSH_CLIENT_JS, /\/api\/push\/unregister/);
  assert.match(PUSH_CLIENT_JS, /keepalive: true/);
  assert.match(PUSH_CLIENT_JS, /location\.assign\(destination\.href\)/);
});

test("Windows push client monitors the live connection and reconnects after failure", () => {
  assert.match(PUSH_CLIENT_JS, /heartbeatTimer = setInterval/);
  assert.match(PUSH_CLIENT_JS, /lastPongAt/);
  assert.match(PUSH_CLIENT_JS, /heartbeat timeout/);
});
