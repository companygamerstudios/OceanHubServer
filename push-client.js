export const PUSH_CLIENT_JS = String.raw`(function () {
  "use strict";
  var api = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  var isTauri = !!api;
  var ua = String(navigator.userAgent || "");
  var androidApp = isTauri && /Android/i.test(ua);
  var windowsApp = isTauri && (/Windows/i.test(ua) || /Win32|Win64/i.test(navigator.platform || ""));
  var socket = null;
  var reconnectTimer = null;
  var heartbeatTimer = null;
  var lastPongAt = 0;
  var retry = 0;
  var webPushInitialized = false;
  var foregroundPollTimer = null;
  var foregroundKnownIds = null;
  var foregroundPollInFlight = false;
  var foregroundPreferences = { messages: true, social: true, system: true };
  var foregroundPreferencesAt = 0;

  function byId(id) { return document.getElementById(id); }
  function status(message, isError) {
    var node = byId("pushStatus");
    if (node) {
      node.textContent = message;
      node.style.color = isError ? "#ff9a9a" : "";
    }
  }
  async function requestJson(url, options) {
    var response = await fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, options || {}));
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || ("HTTP " + response.status));
    return data;
  }
  async function post(url, body) {
    return requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
  }
  function registerToken(platform, token) {
    if (!token || typeof token !== "string") throw new Error("Firebase no devolvió un token válido.");
    return post("/api/push/register", { platform: platform, token: token });
  }
  function localFlag(name) {
    try { return localStorage.getItem(name) === "1"; } catch (_) { return false; }
  }
  function setLocalFlag(name, value) {
    try { if (value) localStorage.setItem(name, "1"); else localStorage.removeItem(name); } catch (_) {}
  }

  async function currentDeviceRegistration() {
    if (androidApp && localFlag("oh_push_android_enabled")) {
      var androidToken = await api("plugin:fcm|get_token");
      return androidToken && androidToken.token ? {
        platform: "android",
        token: androidToken.token,
        revoke: function () { return api("plugin:fcm|delete_token"); }
      } : null;
    }
    if (windowsApp && localFlag("oh_push_windows_enabled")) {
      return { platform: "windows", token: getWindowsDeviceToken() };
    }
    if (!isTauri && localFlag("oh_push_web_enabled") &&
        typeof Notification !== "undefined" && Notification.permission === "granted" &&
        "serviceWorker" in navigator) {
      var config = await requestJson("/api/push/config");
      if (!config.webEnabled || !config.firebaseConfig || !config.vapidKey) return null;
      var registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) return null;
      var appModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js");
      var messagingModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging.js");
      if (!await messagingModule.isSupported()) return null;
      var app = appModule.getApps().find(function (entry) { return entry.name === "oceanhub-web-push"; }) ||
        appModule.initializeApp(config.firebaseConfig, "oceanhub-web-push");
      var messaging = messagingModule.getMessaging(app);
      var token = await messagingModule.getToken(messaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: registration
      });
      return token ? {
        platform: "web",
        token: token,
        revoke: function () { return messagingModule.deleteToken(messaging); }
      } : null;
    }
    return null;
  }

  function bindLogoutCleanup() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (target && target.nodeType === 3) target = target.parentElement;
      var link = target && target.closest ? target.closest('a[href]') : null;
      if (!link) return;
      var destination;
      try { destination = new URL(link.href, location.href); } catch (_) { return; }
      if (destination.origin !== location.origin || destination.pathname !== "/logout") return;
      if (link.dataset.ohPushLogoutPending === "1") {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      link.dataset.ohPushLogoutPending = "1";
      var devicePromise = currentDeviceRegistration().catch(function () { return null; });
      // Do not carry a previous account's opt-in into the next account on a shared device.
      setLocalFlag("oh_push_android_enabled", false);
      setLocalFlag("oh_push_web_enabled", false);
      setLocalFlag("oh_push_windows_enabled", false);
      closeWindowsSocket();
      if (windowsApp && api) api("plugin:autostart|disable").catch(function () {});
      var cleanup = (async function () {
        try {
          var device = await devicePromise;
          if (!device) return;
          var jobs = [fetch("/api/push/unregister", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: device.platform, token: device.token })
          })];
          if (typeof device.revoke === "function") {
            jobs.push(Promise.resolve().then(device.revoke).catch(function () {}));
          }
          await Promise.allSettled(jobs);
        } catch (_) {
          // Logout must remain available even when a push provider or the network fails.
        }
      })();
      var timeout = new Promise(function (resolve) { setTimeout(resolve, 2500); });
      Promise.race([cleanup, timeout]).finally(function () {
        location.assign(destination.href);
      });
    }, true);
  }
  function getWindowsDeviceToken() {
    try {
      var value = localStorage.getItem("oh_push_windows_device_id");
      if (!value) {
        value = Array.from(crypto.getRandomValues(new Uint8Array(32)), function (byte) {
          return byte.toString(16).padStart(2, "0");
        }).join("");
        localStorage.setItem("oh_push_windows_device_id", value);
      }
      return value;
    } catch (_) {
      throw new Error("No se pudo crear el identificador seguro de este dispositivo.");
    }
  }

  async function setupAndroid() {
    if (!api) throw new Error("El puente nativo de OceanHub no está disponible.");
    var permission = await api("plugin:fcm|request_permissions");
    var permissionGranted = permission === "granted" || !!(permission && permission.notification === "granted");
    if (!permissionGranted) {
      throw new Error("Android no concedió el permiso para mostrar notificaciones.");
    }
    await api("plugin:fcm|register");
    await api("plugin:fcm|create_channel", {
      args: { id: "oceanhub_messages", name: "Mensajes y actividad de OceanHub", importance: 4 }
    });
    var result = await api("plugin:fcm|get_token");
    if (!result || !result.token) throw new Error("Firebase no devolvió el token de este Android.");
    setLocalFlag("oh_push_android_enabled", true);
    startForegroundPolling();
    try {
      await registerToken("android", result.token);
      status("Notificaciones Android activadas en este dispositivo.");
    } catch (_) {
      status("Avisos en primer plano activados. La entrega push en segundo plano espera la conexión del servidor.");
    }
  }

  async function setupWeb() {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      throw new Error("Este navegador no admite notificaciones Web Push.");
    }
    // Ask permission immediately within the user's click gesture, before any network await.
    var permission = Notification.permission;
    if (permission !== "granted") permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("No se concedió el permiso de notificaciones.");
    var config = await requestJson("/api/push/config");
    if (!config.webEnabled || !config.firebaseConfig || !config.vapidKey) {
      throw new Error("La configuración Web Push de Firebase todavía no está terminada.");
    }
    var registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    var appModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js");
    var messagingModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging.js");
    if (!await messagingModule.isSupported()) throw new Error("Firebase Messaging no es compatible con este navegador.");
    var app = appModule.getApps().find(function (entry) { return entry.name === "oceanhub-web-push"; }) ||
      appModule.initializeApp(config.firebaseConfig, "oceanhub-web-push");
    var messaging = messagingModule.getMessaging(app);
    var token = await messagingModule.getToken(messaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: registration
    });
    await registerToken("web", token);
    if (!webPushInitialized) {
      messagingModule.onMessage(messaging, function (payload) {
        if (document.visibilityState !== "visible") return;
        var notification = payload.notification || payload.data || {};
        var title = String(notification.title || "OceanHub");
        var body = String(notification.body || "Tienes una nueva notificación");
        if (Notification.permission === "granted") new Notification(title, { body: body, icon: "/favicon.ico" });
      });
      webPushInitialized = true;
    }
    setLocalFlag("oh_push_web_enabled", true);
    status("Notificaciones Web Push activadas en este navegador.");
  }

  async function setupWindows() {
    if (!api) throw new Error("El puente nativo de OceanHub no está disponible.");
    var notificationApi = window.__TAURI__ && window.__TAURI__.notification;
    if (!notificationApi) throw new Error("El sistema de notificaciones de Windows no está disponible.");
    var permissionGranted = await notificationApi.isPermissionGranted();
    if (!permissionGranted) permissionGranted = (await notificationApi.requestPermission()) === "granted";
    if (!permissionGranted) throw new Error("Windows no concedió permiso para mostrar notificaciones.");
    setLocalFlag("oh_push_windows_enabled", true);
    startForegroundPolling();
    var serverRegistrationReady = true;
    try { await registerToken("windows", getWindowsDeviceToken()); }
    catch (_) { serverRegistrationReady = false; }
    if (byId("pushAutostart") && byId("pushAutostart").checked) {
      await api("plugin:autostart|enable");
    }
    connectWindows();
    status(serverRegistrationReady
      ? "Notificaciones activadas mientras OceanHub esté en ejecución."
      : "Avisos en primer plano activados. La conexión push del servidor aún está pendiente.");
  }

  async function enablePush() {
    try {
      status("Activando notificaciones…");
      if (androidApp) await setupAndroid();
      else if (windowsApp) await setupWindows();
      else await setupWeb();
    } catch (error) {
      status(error && error.message ? error.message : "No se pudieron activar las notificaciones.", true);
    }
  }

  async function disablePush() {
    try {
      if (androidApp && localFlag("oh_push_android_enabled")) {
        var androidToken = await api("plugin:fcm|get_token");
        if (androidToken && androidToken.token) await post("/api/push/unregister", { platform: "android", token: androidToken.token });
        await api("plugin:fcm|delete_token");
        setLocalFlag("oh_push_android_enabled", false);
        stopForegroundPolling();
      } else if (windowsApp) {
        await post("/api/push/unregister", { platform: "windows", token: getWindowsDeviceToken() });
        setLocalFlag("oh_push_windows_enabled", false);
        stopForegroundPolling();
        closeWindowsSocket();
        try { await api("plugin:autostart|disable"); } catch (_) {}
        if (byId("pushAutostart")) byId("pushAutostart").checked = false;
      } else if (localFlag("oh_push_web_enabled")) {
        var config = await requestJson("/api/push/config");
        var appModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js");
        var messagingModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging.js");
        var app = appModule.getApps().find(function (entry) { return entry.name === "oceanhub-web-push"; }) ||
          appModule.initializeApp(config.firebaseConfig, "oceanhub-web-push");
        var messaging = messagingModule.getMessaging(app);
        var token = await messagingModule.getToken(messaging, { vapidKey: config.vapidKey });
        await post("/api/push/unregister", { platform: "web", token: token });
        await messagingModule.deleteToken(messaging);
        setLocalFlag("oh_push_web_enabled", false);
      }
      status("Notificaciones desactivadas en este dispositivo.");
    } catch (error) {
      status(error && error.message ? error.message : "No se pudo completar la desactivación.", true);
    }
  }

  function closeWindowsSocket() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    reconnectTimer = null;
    heartbeatTimer = null;
    if (socket) {
      try { socket.close(1000, "user disabled"); } catch (_) {}
    }
    socket = null;
  }

  function showWindowsNotification(data) {
    var title = String(data.title || "OceanHub").slice(0, 120);
    var body = String(data.body || "").slice(0, 180);
    var notificationApi = window.__TAURI__ && window.__TAURI__.notification;
    if (notificationApi && typeof notificationApi.sendNotification === "function") {
      try {
        var result = notificationApi.sendNotification({ title: title, body: body });
        if (result && typeof result.catch === "function") result.catch(function () {});
      } catch (_) {}
    }
  }

  function showForegroundNotification(item) {
    var type = String(item && item.type || "info");
    var title = String(item && item.title || "OceanHub").slice(0, 120);
    var body = type === "dm"
      ? "Tienes un nuevo mensaje privado. Abre OceanHub para leerlo."
      : String(item && item.body || "Tienes una nueva notificación").slice(0, 180);
    var notificationApi = window.__TAURI__ && window.__TAURI__.notification;
    if (!notificationApi || typeof notificationApi.sendNotification !== "function") return;
    try {
      var result = notificationApi.sendNotification({
        title: title,
        body: body,
        channelId: "oceanhub_messages"
      });
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (_) {}
  }

  function foregroundCategory(type) {
    var value = String(type || "").toLowerCase();
    if (value === "dm" || value === "message" || value.indexOf("message") >= 0) return "messages";
    if (["verification", "verification_request", "security", "payment", "system"].indexOf(value) >= 0) return "system";
    return "social";
  }

  async function refreshForegroundPreferences() {
    if (Date.now() - foregroundPreferencesAt < 60000) return;
    foregroundPreferencesAt = Date.now();
    try {
      var response = await fetch("/api/push/preferences", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) return;
      var result = await response.json();
      if (result && result.preferences) {
        ["messages", "social", "system"].forEach(function (key) {
          foregroundPreferences[key] = result.preferences[key] !== false;
        });
      }
    } catch (_) {
      // Preferences are optional until the push API is deployed; default to enabled.
    }
  }

  async function pollForegroundNotifications() {
    var enabled = (androidApp && localFlag("oh_push_android_enabled")) ||
      (windowsApp && localFlag("oh_push_windows_enabled"));
    if (!isTauri || !enabled || foregroundPollInFlight) return;
    // Prefer the live Windows socket when it is healthy to avoid duplicate alerts.
    if (windowsApp && socket && socket.readyState === WebSocket.OPEN) return;
    foregroundPollInFlight = true;
    try {
      var response = await fetch("/api/notifications", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) return;
      var result = await response.json();
      var notifications = Array.isArray(result.notifications) ? result.notifications : [];
      await refreshForegroundPreferences();
      if (foregroundKnownIds === null) {
        foregroundKnownIds = new Set(notifications.map(function (item) { return String(item && item.id || ""); }).filter(Boolean));
        return;
      }
      var fresh = notifications.filter(function (item) {
        var id = String(item && item.id || "");
        var category = foregroundCategory(item && item.type);
        return id && !foregroundKnownIds.has(id) && foregroundPreferences[category] !== false;
      });
      fresh.slice().reverse().forEach(showForegroundNotification);
      notifications.forEach(function (item) {
        var id = String(item && item.id || "");
        if (id) foregroundKnownIds.add(id);
      });
      while (foregroundKnownIds.size > 100) {
        foregroundKnownIds.delete(foregroundKnownIds.values().next().value);
      }
    } catch (_) {
      // Foreground polling is a resilient fallback; it must not interrupt the app.
    } finally {
      foregroundPollInFlight = false;
    }
  }

  function startForegroundPolling() {
    if (foregroundPollTimer) clearInterval(foregroundPollTimer);
    foregroundKnownIds = null;
    foregroundPreferencesAt = 0;
    foregroundPreferences = { messages: true, social: true, system: true };
    pollForegroundNotifications();
    foregroundPollTimer = setInterval(pollForegroundNotifications, 15000);
  }

  function stopForegroundPolling() {
    if (foregroundPollTimer) clearInterval(foregroundPollTimer);
    foregroundPollTimer = null;
    foregroundKnownIds = null;
  }

  function connectWindows() {
    if (!windowsApp || !localFlag("oh_push_windows_enabled") || socket || document.visibilityState === "prerender") return;
    var protocol = location.protocol === "https:" ? "wss:" : "ws:";
    try {
      socket = new WebSocket(protocol + "//" + location.host + "/api/push/socket");
      socket.onopen = function () {
        retry = 0;
        lastPongAt = Date.now();
        try { socket.send(JSON.stringify({ type: "ping" })); } catch (_) {}
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(function () {
          if (!socket || socket.readyState !== WebSocket.OPEN) return;
          if (Date.now() - lastPongAt > 75000) {
            try { socket.close(4000, "heartbeat timeout"); } catch (_) {}
            return;
          }
          try { socket.send(JSON.stringify({ type: "ping" })); } catch (_) {}
        }, 25000);
      };
      socket.onmessage = function (event) {
        var data;
        try { data = JSON.parse(event.data); } catch (_) { return; }
        if (!data) return;
        if (data.type === "pong") { lastPongAt = Date.now(); return; }
        showWindowsNotification(data);
      };
      socket.onclose = function () {
        socket = null;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        if (!localFlag("oh_push_windows_enabled")) return;
        var wait = Math.min(30000, 1000 * Math.pow(2, Math.min(retry++, 5)));
        reconnectTimer = setTimeout(connectWindows, wait);
      };
      socket.onerror = function () {
        try { socket.close(); } catch (_) {}
      };
    } catch (_) {
      socket = null;
    }
  }

  function bindControls() {
    var enable = byId("pushEnable");
    var disable = byId("pushDisable");
    if (enable) enable.addEventListener("click", enablePush);
    if (disable) disable.addEventListener("click", disablePush);
    var preferenceIds = {
      messages: "pushPrefMessages",
      social: "pushPrefSocial",
      system: "pushPrefSystem"
    };
    if (byId(preferenceIds.messages) || byId(preferenceIds.social) || byId(preferenceIds.system)) {
      requestJson("/api/push/preferences").then(function (result) {
        Object.keys(preferenceIds).forEach(function (key) {
          var control = byId(preferenceIds[key]);
          if (control) control.checked = result.preferences && result.preferences[key] !== false;
        });
      }).catch(function (error) { status(error.message || "No se pudieron cargar las preferencias.", true); });
      Object.keys(preferenceIds).forEach(function (key) {
        var control = byId(preferenceIds[key]);
        if (!control) return;
        control.addEventListener("change", function () {
          var preferences = {};
          Object.keys(preferenceIds).forEach(function (name) {
            var input = byId(preferenceIds[name]);
            if (input) preferences[name] = input.checked;
          });
          post("/api/push/preferences", preferences).catch(function (error) {
            control.checked = !control.checked;
            status(error.message || "No se pudo guardar la preferencia.", true);
          });
        });
      });
    }
    var autostartWrap = byId("pushAutostartWrap");
    if (autostartWrap && windowsApp) autostartWrap.hidden = false;
    var autostart = byId("pushAutostart");
    if (autostart && windowsApp) {
      api("plugin:autostart|is_enabled").then(function (enabled) { autostart.checked = !!enabled; }).catch(function () {});
      autostart.addEventListener("change", function () {
        if (autostart.checked && !localFlag("oh_push_windows_enabled")) {
          autostart.checked = false;
          status("Primero activa las notificaciones de OceanHub en este dispositivo.", true);
          return;
        }
        var action = autostart.checked ? "plugin:autostart|enable" : "plugin:autostart|disable";
        api(action).catch(function (error) {
          autostart.checked = !autostart.checked;
          status(error && error.message ? error.message : "No se pudo cambiar el inicio automático.", true);
        });
      });
    }
  }

  function boot() {
    bindLogoutCleanup();
    bindControls();
    if (androidApp && localFlag("oh_push_android_enabled")) {
      startForegroundPolling();
      api("plugin:fcm|get_token").then(function (result) {
        if (result && result.token) return registerToken("android", result.token);
      }).catch(function () {});
    }
    if (!androidApp && !windowsApp && localFlag("oh_push_web_enabled") && Notification.permission === "granted") {
      setupWeb().catch(function () {});
    }
    if (windowsApp && localFlag("oh_push_windows_enabled")) {
      startForegroundPolling();
      registerToken("windows", getWindowsDeviceToken()).then(connectWindows).catch(function () { connectWindows(); });
    }
    window.addEventListener("beforeunload", function () {
      if (socket) {
        try { socket.close(1000, "page navigation"); } catch (_) {}
        socket = null;
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();`;
