import test from 'node:test';
import assert from 'node:assert/strict';
import { workerFetch, KVLocker } from '../OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const TEST_KEY = 'OCEANHUB-INTEGRATION-TEST-KEY';
const TEST_HMAC_SECRET = 'ocean-hub-hmac-test-secret-32-bytes-minimum';
const TEST_IP = '203.0.113.42';

function createDurableObjectNamespace() {
  const instances = new Map();
  return {
    idFromName(name) { return String(name); },
    get(id) {
      const name = String(id);
      if (!instances.has(name)) {
        const values = new Map();
        const storage = {
          kv: {
            get(key) { return values.get(key); },
            put(key, value) { values.set(key, value); },
            delete(key) { return values.delete(key); }
          },
          transactionSync(callback) { return callback(); }
        };
        instances.set(name, new KVLocker({ storage }));
      }
      const durableObject = instances.get(name);
      return { fetch(input, init) { const request = input instanceof Request ? input : new Request(input, init); return durableObject.fetch(request); } };
    }
  };
}

function createTestEnvironment() {
  const values = new Map();
  const STATS = {
    async get(key, type) {
      const value = values.get(String(key));
      if (value === undefined) return null;
      if (type === 'json') {
        try { return JSON.parse(value); } catch { return null; }
      }
      return value;
    },
    async put(key, value) {
      values.set(String(key), typeof value === 'string' ? value : JSON.stringify(value));
    },
    async delete(key) { values.delete(String(key)); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...values.keys()]
        .filter(key => key.startsWith(prefix))
        .slice(0, limit)
        .map(name => ({ name }));
      return { keys, list_complete: true, cursor: undefined };
    }
  };
  return {
    STATS,
    KV_LOCKER: createDurableObjectNamespace(),
    STATIC_KEYS_JSON: JSON.stringify([{
      key: TEST_KEY,
      type: 'premium',
      rango: 'Tripulante de prueba',
      expires: 'permanente',
      blocked: false,
      un_solo_uso: false,
      maxUses: 100
    }]),
    HMAC_SECRET_CURRENT: TEST_HMAC_SECRET,
    DYNAMIC_KEY_INDEX_SECRET: 'test-index-secret-0123456789-ABCDEFG',
    DYNAMIC_KEY_ENCRYPTION_SECRET: 'test-encryption-secret-0123456789-XYZ'
  };
}

async function signHmac(message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(TEST_HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function requestNonce(env, ip = TEST_IP) {
  const response = await workerFetch(new Request('https://ocean.test/get-nonce', {
    method: 'GET',
    headers: { 'CF-Connecting-IP': ip, 'User-Agent': 'OceanHub V8 integration test' }
  }), env);
  assert.equal(response.status, 200, 'GET /get-nonce debe emitir el Nonce');
  const body = await response.json();
  assert.match(body.nonce, /^[A-F0-9]{32}$/);
  return body.nonce;
}

async function verifyWithNonce(env, nonce, options = {}) {
  const ip = options.ip || TEST_IP;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const message = `${TEST_KEY}:${timestamp}:${nonce}`;
  const hmac = options.hmac || await signHmac(message);
  return await workerFetch(new Request('https://ocean.test/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': ip,
      'User-Agent': 'OceanHub V8 integration test'
    },
    body: JSON.stringify({ key: TEST_KEY, timestamp, nonce, hmac })
  }), env);
}

test('OceanHub V8 HMAC contract: issue Nonce, verify key, reject replay', async () => {
  const env = createTestEnvironment();
  const nonce = await requestNonce(env);
  const first = await verifyWithNonce(env, nonce);
  const firstBody = await first.json();

  assert.equal(first.status, 200);
  assert.equal(firstBody.success, true);
  assert.equal(firstBody.valid, true);
  assert.equal(firstBody.rango, 'Tripulante de prueba');

  const replay = await verifyWithNonce(env, nonce);
  const replayBody = await replay.json();
  assert.equal(replay.status, 400);
  assert.equal(replayBody.success, false);
  assert.match(replayBody.error, /Nonce inválido/);
});

test('OceanHub V8 HMAC contract: a wrong signature is rejected and the Nonce cannot be replayed', async () => {
  const env = createTestEnvironment();
  const nonce = await requestNonce(env);
  const rejected = await verifyWithNonce(env, nonce, { hmac: '0'.repeat(64) });
  const rejectedBody = await rejected.json();

  assert.equal(rejected.status, 400);
  assert.equal(rejectedBody.success, false);
  assert.match(rejectedBody.error, /Firma inválida/);

  const replay = await verifyWithNonce(env, nonce);
  const replayBody = await replay.json();
  assert.equal(replay.status, 400);
  assert.match(replayBody.error, /Nonce inválido/);
});

test('OceanHub V8 HMAC contract: Nonce is bound to the requesting IP', async () => {
  const env = createTestEnvironment();
  const nonce = await requestNonce(env, TEST_IP);
  const wrongIp = await verifyWithNonce(env, nonce, { ip: '203.0.113.99' });
  const wrongIpBody = await wrongIp.json();

  assert.equal(wrongIp.status, 400);
  assert.match(wrongIpBody.error, /Nonce inválido/);

  // A rejected request from another IP does not burn the legitimate client's nonce.
  const correctIp = await verifyWithNonce(env, nonce, { ip: TEST_IP });
  const correctIpBody = await correctIp.json();
  assert.equal(correctIp.status, 200);
  assert.equal(correctIpBody.success, true);
});
