const DEVICE_PREFIX = "oh_push_devices_";
const PREFS_PREFIX = "oh_push_prefs_";
const MAX_DEVICES_PER_USER = 12;
const MAX_REGISTRATION_TOKEN_LENGTH = 4096;
const FIREBASE_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FIREBASE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIREBASE_SDK_VERSION = "13.4.0";

let accessTokenCache = null;
const cryptoKeyCache = new Map();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

function base64Url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function normalizedEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeHref(value) {
  const path = String(value || "/notifications").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) {
    return "/notifications";
  }
  return path.slice(0, 200);
}

function categoryForType(type) {
  const value = String(type || "").toLowerCase();
  if (value === "dm" || value === "message" || value.includes("message")) return "messages";
  if (["verification", "verification_request", "security", "payment", "system"].includes(value)) return "system";
  return "social";
}

export function validatePushRegistration(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "invalid_body" };
  const platform = String(input.platform || "").toLowerCase();
  const token = String(input.token || "").trim();
  if (!["android", "web"].includes(platform)) return { ok: false, reason: "invalid_platform" };
  if (token.length < 40 || token.length > MAX_REGISTRATION_TOKEN_LENGTH) return { ok: false, reason: "invalid_token" };
  if (/[\u0000-\u001f\u007f]/.test(token)) return { ok: false, reason: "invalid_token" };
  return { ok: true, platform, token };
}

async function getEncryptionKey(env) {
  const secret = String(env?.PUSH_TOKEN_ENCRYPTION_SECRET || "");
  if (secret.length < 32) throw new Error("PUSH_TOKEN_ENCRYPTION_SECRET no está configurado correctamente");
  if (!cryptoKeyCache.has(secret)) {
    const pending = (async () => {
      const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
      return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    })();
    cryptoKeyCache.set(secret, pending);
    pending.catch(() => cryptoKeyCache.delete(secret));
  }
  return cryptoKeyCache.get(secret);
}

export async function encryptPushToken(env, token) {
  const key = await getEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(String(token))
  );
  return { version: 1, iv: base64Url(iv), ciphertext: base64Url(new Uint8Array(ciphertext)) };
}

export async function decryptPushToken(env, envelope) {
  if (!envelope || envelope.version !== 1 || typeof envelope.iv !== "string" || typeof envelope.ciphertext !== "string") {
    throw new Error("Token cifrado no válido");
  }
  const key = await getEncryptionKey(env);
  const iv = fromBase64(envelope.iv.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - envelope.iv.length % 4) % 4));
  const ciphertext = fromBase64(envelope.ciphertext.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - envelope.ciphertext.length % 4) % 4));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

async function emailStorageKey(email) {
  return DEVICE_PREFIX + await sha256(normalizedEmail(email));
}

async function readDevices(env, email) {
  const rows = await env.STATS.get(await emailStorageKey(email), "json");
  return Array.isArray(rows) ? rows.slice(0, MAX_DEVICES_PER_USER) : [];
}

async function writeDevices(env, email, rows) {
  const clean = (Array.isArray(rows) ? rows : []).slice(0, MAX_DEVICES_PER_USER);
  await env.STATS.put(await emailStorageKey(email), JSON.stringify(clean));
  return clean;
}

async function readPreferences(env, email) {
  const key = PREFS_PREFIX + await sha256(normalizedEmail(email));
  const current = await env.STATS.get(key, "json");
  return {
    messages: current?.messages !== false,
    social: current?.social !== false,
    system: current?.system !== false,
    windows: current?.windows === true
  };
}

async function writePreferences(env, email, input) {
  const previous = await readPreferences(env, email);
  const next = {
    messages: typeof input.messages === "boolean" ? input.messages : previous.messages,
    social: typeof input.social === "boolean" ? input.social : previous.social,
    system: typeof input.system === "boolean" ? input.system : previous.system,
    windows: typeof input.windows === "boolean" ? input.windows : previous.windows
  };
  const key = PREFS_PREFIX + await sha256(normalizedEmail(email));
  await env.STATS.put(key, JSON.stringify(next));
  return next;
}

function getFirebaseWebConfig(env) {
  try {
    const config = JSON.parse(String(env?.FIREBASE_WEB_CONFIG_JSON || ""));
    const required = ["apiKey", "authDomain", "projectId", "messagingSenderId", "appId"];
    if (!config || typeof config !== "object" || required.some(key => typeof config[key] !== "string" || !config[key])) return null;
    return Object.fromEntries(required.concat(["storageBucket"]).filter(key => typeof config[key] === "string").map(key => [key, config[key]]));
  } catch {
    return null;
  }
}

export async function handlePushApi(env, request, email) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "Origen no permitido" }, 403);

  if (request.method === "GET" && path === "/api/push/config") {
    const config = getFirebaseWebConfig(env);
    const preferences = await readPreferences(env, email);
    const devices = await readDevices(env, email);
    return json({
      webEnabled: !!(config && env.FIREBASE_WEB_VAPID_KEY),
      firebaseConfig: config,
      vapidKey: config && env.FIREBASE_WEB_VAPID_KEY ? String(env.FIREBASE_WEB_VAPID_KEY) : null,
      preferences,
      registeredDevices: devices.length
    });
  }

  if (path === "/api/push/preferences" && request.method === "GET") {
    return json({ preferences: await readPreferences(env, email) });
  }

  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const text = await request.text();
  if (text.length > 12_000) return json({ error: "Solicitud demasiado grande" }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "JSON inválido" }, 400); }

  if (path === "/api/push/register") {
    const validation = validatePushRegistration(body);
    if (!validation.ok) return json({ error: "Registro de dispositivo no válido", code: validation.reason }, 400);
    let encrypted;
    try { encrypted = await encryptPushToken(env, validation.token); }
    catch (error) {
      console.error("Push token encryption is unavailable:", error?.message || error);
      return json({ error: "El servicio de notificaciones aún no está configurado" }, 503);
    }
    const deviceId = await sha256(validation.platform + ":" + validation.token);
    const current = await readDevices(env, email);
    const next = current.filter(device => device?.id !== deviceId);
    next.unshift({
      id: deviceId,
      platform: validation.platform,
      token: encrypted,
      createdAt: current.find(device => device?.id === deviceId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userAgent: String(request.headers.get("User-Agent") || "unknown").slice(0, 180)
    });
    await writeDevices(env, email, next);
    return json({ ok: true, registeredDevices: Math.min(next.length, MAX_DEVICES_PER_USER) });
  }

  if (path === "/api/push/unregister") {
    const platform = String(body?.platform || "").toLowerCase();
    const token = String(body?.token || "").trim();
    if (!["android", "web"].includes(platform) || token.length < 40 || token.length > MAX_REGISTRATION_TOKEN_LENGTH) {
      return json({ error: "Registro no válido" }, 400);
    }
    const deviceId = await sha256(platform + ":" + token);
    const current = await readDevices(env, email);
    await writeDevices(env, email, current.filter(device => device?.id !== deviceId));
    return json({ ok: true });
  }

  if (path === "/api/push/preferences") {
    return json({ ok: true, preferences: await writePreferences(env, email, body || {}) });
  }

  return json({ error: "Ruta no encontrada" }, 404);
}

function pemToBytes(pem) {
  const normalized = String(pem || "").replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  if (!normalized || normalized.length > 16_384) throw new Error("Clave privada de Firebase no válida");
  return fromBase64(normalized);
}

async function getFirebaseAccessToken(env) {
  const raw = String(env?.FIREBASE_SERVICE_ACCOUNT_JSON || "");
  if (!raw || raw.length > 24_000) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no está configurado");
  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); } catch { throw new Error("Credencial Firebase JSON no válida"); }
  const projectId = String(serviceAccount.project_id || "");
  const clientEmail = String(serviceAccount.client_email || "");
  if (!/^[a-z0-9-]{4,80}$/.test(projectId) || !/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(clientEmail)) {
    throw new Error("Identidad de cuenta de servicio Firebase no válida");
  }
  if (accessTokenCache && accessTokenCache.projectId === projectId && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return { accessToken: accessTokenCache.accessToken, projectId };
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    base64Url(JSON.stringify({ iss: clientEmail, scope: FIREBASE_SCOPE, aud: FIREBASE_TOKEN_URL, iat: now, exp: now + 3600 }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = unsigned + "." + base64Url(new Uint8Array(signature));
  const response = await fetch(FIREBASE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== "string") {
    throw new Error("Google OAuth no pudo emitir el token de acceso (HTTP " + response.status + ")");
  }
  accessTokenCache = {
    projectId,
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000
  };
  return { accessToken: data.access_token, projectId };
}

async function removeDeviceById(env, email, deviceId) {
  const devices = await readDevices(env, email);
  await writeDevices(env, email, devices.filter(device => device?.id !== deviceId));
}

async function sendFcmToDevice(env, email, device, notification) {
  const { accessToken, projectId } = await getFirebaseAccessToken(env);
  const token = await decryptPushToken(env, device.token);
  const href = safeHref(notification.href);
  const title = String(notification.title || "OceanHub").slice(0, 120);
  const body = String(notification.body || "Tienes una nueva notificación").slice(0, 180);
  const message = {
    token,
    notification: { title, body },
    data: {
      title,
      body,
      type: String(notification.type || "info").slice(0, 40),
      url: href
    }
  };
  if (device.platform === "android") {
    message.android = {
      priority: "high",
      notification: { channel_id: "oceanhub_messages", sound: "default" }
    };
  } else if (device.platform === "web") {
    const baseUrl = String(env.BASE_URL || "https://oceanhud.yoelenmanuelzorrilla.workers.dev").replace(/\/+$/, "");
    message.webpush = {
      headers: { TTL: "86400", Urgency: "high" },
      notification: {
        title,
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "oceanhub-" + String(notification.type || "notice").slice(0, 24),
        data: { url: baseUrl + href }
      },
      fcm_options: { link: baseUrl + href }
    };
  }

  const response = await fetch("https://fcm.googleapis.com/v1/projects/" + encodeURIComponent(projectId) + "/messages:send", {
    method: "POST",
    headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  if (response.ok) return true;
  const error = await response.json().catch(() => ({}));
  const details = Array.isArray(error?.error?.details) ? error.error.details : [];
  const errorCode = details.map(item => item?.errorCode).find(Boolean) || "";
  if (response.status === 404 || errorCode === "UNREGISTERED") await removeDeviceById(env, email, device.id);
  console.warn("FCM delivery failed:", response.status, errorCode || "provider_error");
  return false;
}

async function sendWindowsSocketEvent(env, email, notification) {
  if (!env?.KV_LOCKER) return;
  const emailHash = await sha256(normalizedEmail(email));
  const id = env.KV_LOCKER.idFromName("push-live:" + emailHash);
  const stub = env.KV_LOCKER.get(id);
  const response = await stub.fetch("https://push.internal/realtime/push/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: String(notification.title || "OceanHub").slice(0, 120),
      body: String(notification.body || "").slice(0, 180),
      type: String(notification.type || "info").slice(0, 40),
      href: safeHref(notification.href),
      at: new Date().toISOString()
    })
  });
  if (!response.ok) throw new Error("Push relay returned HTTP " + response.status);
}

export async function sendPushToUser(env, email, notification) {
  try {
    const preferences = await readPreferences(env, email);
    const category = categoryForType(notification?.type);
    if (preferences[category] === false) return;
    const jobs = [];
    if (preferences.windows) {
      jobs.push(sendWindowsSocketEvent(env, email, notification).catch(error => {
        console.warn("Windows push relay unavailable:", error?.message || error);
      }));
    }
    const devices = await readDevices(env, email);
    if (devices.length && env.FIREBASE_SERVICE_ACCOUNT_JSON && env.PUSH_TOKEN_ENCRYPTION_SECRET) {
      for (const device of devices) {
        if (device?.platform !== "android" && device?.platform !== "web") continue;
        jobs.push(sendFcmToDevice(env, email, device, notification).catch(error => {
          console.warn("FCM dispatch unavailable:", error?.message || error);
        }));
      }
    }
    await Promise.all(jobs);
  } catch (error) {
    // Push delivery is deliberately best-effort: it must never fail message persistence.
    console.warn("Push dispatch skipped:", error?.message || error);
  }
}

export async function handlePushSocket(env, request, email) {
  if (request.method !== "GET" || String(request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return json({ error: "Se requiere una conexión WebSocket" }, 426);
  }
  const emailHash = await sha256(normalizedEmail(email));
  const id = env.KV_LOCKER.idFromName("push-live:" + emailHash);
  const stub = env.KV_LOCKER.get(id);
  const internalRequest = new Request("https://push.internal/realtime/push/connect", request);
  return stub.fetch(internalRequest);
}

export function handleFirebaseMessagingServiceWorker(env) {
  const config = getFirebaseWebConfig(env);
  if (!config) {
    return new Response("// OceanHub Web Push aún no está configurado.\n", {
      status: 503,
      headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  const serialized = JSON.stringify(config).replace(/</g, "\\u003c");
  const source = \`/* OceanHub Firebase Messaging service worker */
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  var raw = event.notification && event.notification.data && event.notification.data.url || "/notifications";
  var target;
  try { target = new URL(raw, self.location.origin); } catch (_) { return; }
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(windows) {
    for (var i = 0; i < windows.length; i++) {
      if ("focus" in windows[i]) {
        windows[i].navigate(target.href);
        return windows[i].focus();
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
importScripts("https://www.gstatic.com/firebasejs/\${FIREBASE_SDK_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/\${FIREBASE_SDK_VERSION}/firebase-messaging-compat.js");
firebase.initializeApp(\${serialized});
firebase.messaging();
\`;
  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function isPushSocketRequest(request) {
  const url = new URL(request.url);
  return url.pathname === "/api/push/socket" && request.method === "GET";
}
