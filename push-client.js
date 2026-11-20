export const PUSH_CLIENT_JS = String.raw`(function () {
  "use strict";
  var api = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  var isTauri = !!api;
  var ua = String(navigator.userAgent || "");
  var androidApp = isTauri && /Android/i.test(ua);
  var windowsApp = isTauri && (/Windows/i.test(ua) || /Win32|Win64/i.test(navigator.platform || ""));
  var socket = null;
  var reconnectTimer = null;
  var retry = 0;

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
    await api("plugin:fcm|request_permissions");
    await api("plugin:fcm|register");
    await api("plugin:fcm|create_channel", {
      args: { id: "oceanhub_messages", name: "Mensajes y actividad de OceanHub", importance: 4 }
    });
    var result = await api("plugin:fcm|get_token");
    await registerToken("android", result && result.token);
    setLocalFlag("oh_push_android_enabled", true);
    status("Notificaciones Android activadas en este dispositivo.");
  }

  async function setupWeb() {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      throw new Error("Este navegador no admite notificaciones Web Push.");
    }
    var config = await requestJson("/api/push/config");
    if (!config.webEnabled || !config.firebaseConfig || !config.vapidKey) {
      throw new Error("La configuración Web Push de Firebase todavía no está terminada.");
    }
    var permission = Notification.permission;
    if (permission !== "granted") permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("No se concedió el permiso de notificaciones.");
    var registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    var appModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js");
    var messagingModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging.js");
    if (!await messagingModule.isSupported()) throw new Error("Firebase Messaging no es compatible con este navegador.");
    var app = appModule.initializeApp(config.firebaseConfig, "oceanhub-web-push");
    var messaging = messagingModule.getMessaging(app);
    var token = await messagingModule.getToken(messaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: registration
    });
    await registerToken("web", token);
    messagingModule.onMessage(messaging, function (payload) {
      if (document.visibilityState !== "visible") return;
      var notification = payload.notification || payload.data || {};
      var title = String(notification.title || "OceanHub");
      var body = String(notification.body || "Tienes una nueva notificación");
      if (Notification.permission === "granted") new Notification(title, { body: body, icon: "/favicon.ico" });
    });
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
    await registerToken("windows", getWindowsDeviceToken());
    setLocalFlag("oh_push_windows_enabled", true);
    if (byId("pushAutostart") && byId("pushAutostart").checked) {
      await api("plugin:autostart|enable");
    }
    connectWindows();
    status("Notificaciones activadas. Al cerrar la ventana, OceanHub seguirá en la bandeja de Windows.");
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
      } else if (windowsApp) {
        await post("/api/push/unregister", { platform: "windows", token: getWindowsDeviceToken() });
        setLocalFlag("oh_push_windows_enabled", false);
        closeWindowsSocket();
        try { await api("plugin:autostart|disable"); } catch (_) {}
        if (byId("pushAutostart")) byId("pushAutostart").checked = false;
      } else if (localFlag("oh_push_web_enabled")) {
        var config = await requestJson("/api/push/config");
        var appModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js");
        var messagingModule = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging.js");
        var app = appModule.initializeApp(config.firebaseConfig, "oceanhub-web-push");
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
    reconnectTimer = null;
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

  function connectWindows() {
    if (!windowsApp || !localFlag("oh_push_windows_enabled") || socket || document.visibilityState === "prerender") return;
    var protocol = location.protocol === "https:" ? "wss:" : "ws:";
    try {
      socket = new WebSocket(protocol + "//" + location.host + "/api/push/socket");
      socket.onopen = function () {
        retry = 0;
        try { socket.send(JSON.stringify({ type: "ping" })); } catch (_) {}
      };
      socket.onmessage = function (event) {
        var data;
        try { data = JSON.parse(event.data); } catch (_) { return; }
        if (data && data.type !== "pong") showWindowsNotification(data);
      };
      socket.onclose = function () {
        socket = null;
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
        var action = autostart.checked ? "plugin:autostart|enable" : "plugin:autostart|disable";
        api(action).catch(function (error) {
          autostart.checked = !autostart.checked;
          status(error && error.message ? error.message : "No se pudo cambiar el inicio automático.", true);
        });
      });
    }
  }

  function boot() {
    bindControls();
    if (androidApp && localFlag("oh_push_android_enabled")) {
      api("plugin:fcm|get_token").then(function (result) {
        if (result && result.token) return registerToken("android", result.token);
      }).catch(function () {});
    }
    if (!androidApp && !windowsApp && localFlag("oh_push_web_enabled") && Notification.permission === "granted") {
      setupWeb().catch(function () {});
    }
    if (windowsApp && localFlag("oh_push_windows_enabled")) {
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
