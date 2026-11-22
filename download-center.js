export const APP_VERSION = "3.0.0";
const ANDROID_APK_RELEASE_URL = "https://github.com/companygamerstudios/OceanHubServer/releases/download/v3.0.0/OceanHub-Android-arm64-release.apk";
const WINDOWS_EXE_RELEASE_URL = "https://github.com/companygamerstudios/OceanHubServer/releases/download/v3.0.0/OceanHub-Setup-3.0.0-x64.exe";
export const MINIMUM_SUPPORTED_VERSION = APP_VERSION;
export const APP_RELEASE_CHANNEL = "stable";

// Version metadata is public and read-only. Only the native app origin and
// the fixed local Vite development origin may read it cross-origin.
const APP_VERSION_CORS_ORIGINS = new Set([
  "http://tauri.localhost",
  "http://127.0.0.1:1420"
]);

export function compareVersions(left, right) {
  const parse = value => {
    const match = String(value || "").trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) return null;
    return { core: match.slice(1, 4).map(Number), prerelease: match[4] || "" };
  };
  const a = parse(left), b = parse(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, "en", { numeric: true });
}

export function getAppVersionPayload() {
  return {
    name: "OceanHub",
    version: APP_VERSION,
    minimumSupportedVersion: MINIMUM_SUPPORTED_VERSION,
    channel: APP_RELEASE_CHANNEL,
    updateRequired: true,
    downloadUrl: "/download",
    androidDownloadUrl: "/download/android",
    windowsDownloadUrl: "/download/windows",
    releaseNotes: "OceanHub 3.0.0 estable: APK Android ARM64 e instalador Windows x64 verificados por el equipo."
  };
}

function makeResponse(body, type, extra = {}) {
  return new Response(body, { status: 200, headers: {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    ...extra
  }});
}

const ICON = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#12c9ff"/><stop offset="1" stop-color="#1248c8"/></linearGradient></defs>',
  '<rect width="512" height="512" rx="116" fill="#061321"/><rect x="26" y="26" width="460" height="460" rx="104" fill="url(#g)"/>',
  '<path d="M90 278c42-54 85-54 127 0s85 54 127 0 58-53 78-39v72c-26-13-50-7-78 26-42 50-85 50-127 0s-85-50-127 0v-59Z" fill="#fff" opacity=".94"/>',
  '<path d="M90 190c42-54 85-54 127 0s85 54 127 0 58-53 78-39v39c-26-13-50-7-78 26-42 50-85 50-127 0s-85-50-127 0v-26Z" fill="#dffaff" opacity=".88"/></svg>'
].join("");

const SERVICE_WORKER = [
  '"use strict";',
  'self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));',
  'self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));',
  'self.addEventListener("fetch",event=>{',
  ' if(event.request.method!=="GET"||event.request.mode!=="navigate")return;',
  ' event.respondWith(fetch(event.request).catch(()=>new Response("<!doctype html><meta charset=utf-8><meta name=viewport content=width=device-width><title>OceanHub sin conexión</title><body style=background:#061321;color:#e8f7ff;font:16px system-ui;padding:32px><h1>🌊 OceanHub</h1><p>No hay conexión. Vuelve a conectarte para abrir tu espacio de forma segura.</p></body>",{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})));',
  '});'
].join("\n");

const MANIFEST = JSON.stringify({
  id: "/", name: "OceanHub", short_name: "OceanHub",
  description: "La plataforma gamer y social de OceanHub.",
  start_url: "/home?source=installed-app", scope: "/", display: "standalone",
  display_override: ["standalone", "minimal-ui"], orientation: "any",
  background_color: "#061321", theme_color: "#071a2d",
  icons: [
    { src: "/ocean-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
    { src: "/ocean-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
  ]
}, null, 2);

const PAGE = [
  '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<meta name="theme-color" content="#071a2d"><meta name="description" content="Instala OceanHub en Windows o Android.">',
  '<link rel="manifest" href="/app.webmanifest"><link rel="icon" href="/ocean-icon.svg" type="image/svg+xml"><title>Descargar OceanHub</title>',
  '<style>:root{color-scheme:dark;--bg:#061321;--line:rgba(106,193,244,.2);--muted:#91abc3;--cyan:#54d7ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 50% -20%,rgba(0,169,255,.25),transparent 55%),radial-gradient(circle at 90% 80%,rgba(20,82,199,.15),transparent 35%),var(--bg);color:#eaf7ff;font:15px/1.6 Inter,system-ui,Segoe UI,sans-serif;padding:24px}a{color:#79dfff;text-decoration:none}main{width:min(980px,100%);margin:auto}.nav{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:48px}.brand{display:flex;align-items:center;gap:12px;font-weight:850}.logo{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#12c9ff,#1248c8);font-size:23px}.nav a{border:1px solid var(--line);padding:9px 14px;border-radius:12px;background:rgba(8,30,49,.55)}.hero{text-align:center;max-width:760px;margin:0 auto 35px}.eyebrow{color:var(--cyan);font-weight:800;letter-spacing:.17em;font-size:11px}.hero h1{font-size:clamp(36px,7vw,64px);line-height:1.02;letter-spacing:-.055em;margin:12px 0}.hero h1 span{background:linear-gradient(90deg,#fff,#69dfff);background-clip:text;color:transparent}.hero p{color:var(--muted);font-size:16px}.version{display:inline-flex;gap:8px;align-items:center;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:rgba(5,24,41,.7);color:#bdeeff;font-size:12px;margin-top:12px}.dot{width:7px;height:7px;border-radius:50%;background:#47e8ba;box-shadow:0 0 12px #47e8ba}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{background:linear-gradient(145deg,rgba(17,43,66,.85),rgba(7,23,39,.9));border:1px solid var(--line);border-radius:24px;padding:25px;box-shadow:0 20px 60px rgba(0,0,0,.22);backdrop-filter:blur(18px)}.platform{font-size:12px;color:var(--cyan);font-weight:800;letter-spacing:.14em}.card h2{margin:7px 0 3px;font-size:24px}.card p{color:var(--muted);min-height:52px}.platform-icon{font-size:30px;margin-bottom:10px}.install{display:block;text-align:center;width:100%;border:0;border-radius:13px;padding:13px 17px;background:linear-gradient(100deg,#0bb8f4,#1665e8);color:#fff;font-size:14px;font-weight:800;cursor:pointer}.hint{font-size:12px!important;min-height:0!important;margin:12px 0 0}.note{margin-top:18px;border:1px solid rgba(255,198,91,.22);background:rgba(121,76,14,.12);border-radius:15px;padding:14px 16px;color:#f1d5a2;font-size:13px}.section{margin-top:24px}.section h3{font-size:17px}.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.step{border:1px solid var(--line);border-radius:16px;padding:15px;background:rgba(7,24,41,.58)}.step b{display:block;margin-bottom:5px}.step span{color:var(--muted);font-size:13px}.foot{margin:30px 0 10px;text-align:center;color:#6f8ca7;font-size:12px}@media(max-width:680px){body{padding:17px}.nav{margin-bottom:35px}.grid,.steps{grid-template-columns:1fr}.card{padding:21px}.hero p{font-size:14px}}</style></head><body><main>',
  '<nav class="nav"><div class="brand"><div class="logo">🌊</div><span>OCEANHUB</span></div><a href="/welcome">Volver a OceanHub ↗</a></nav>',
  '<section class="hero"><div class="eyebrow">OCEANHUB EVERYWHERE</div><h1>Tu mundo gamer.<br><span>En cualquier dispositivo.</span></h1><p>Instala OceanHub como una aplicación en tu computadora Windows o en tu teléfono Android. Accede desde tu pantalla de inicio, sin tener que buscar la página cada vez.</p><div class="version"><i class="dot"></i> Versión <strong id="version">3.0.1</strong> · Versión estable</div></section>',
  '<section class="grid"><article class="card"><div class="platform-icon">🖥️</div><div class="platform">WINDOWS 10 / 11</div><h2>OceanHub para Windows</h2><p>Instala OceanHub como una ventana independiente desde Microsoft Edge o Google Chrome. Aparecerá en tu menú de aplicaciones.</p><a class="install" id="downloadWindows" href="/download/windows">Descargar instalador EXE</a><p class="hint" id="windowsHint">Windows 10/11 · x64 · Instalador oficial.</p></article>',
  '<article class="card"><div class="platform-icon">📱</div><div class="platform">ANDROID</div><h2>OceanHub para Android</h2><p>Añade OceanHub a tu pantalla de inicio y ábrelo como una aplicación, con su propio icono y vista.</p><a class="install" id="installAndroid" href="/download/android">Descargar APK Android</a><p class="hint" id="androidHint">APK oficial ARM64 · Android 7.0 o superior.</p></article></section>',
  '<div class="note"><strong>Paquetes oficiales:</strong> APK Android ARM64 y EXE Windows x64. Descarga siempre desde este centro oficial. El instalador Windows no está firmado con certificado comercial, por lo que SmartScreen podría mostrar una advertencia de editor desconocido.</div>',
  '<section class="section"><h3>¿Cómo se instala?</h3><div class="steps"><div class="step"><b>1. Abre este sitio</b><span>En Windows usa Edge o Chrome. En Android abre esta misma página con Chrome.</span></div><div class="step"><b>2. Pulsa Instalar</b><span>Cuando el navegador ofrezca la instalación, acepta el aviso del sistema.</span></div><div class="step"><b>3. Abre OceanHub</b><span>El icono aparecerá entre tus aplicaciones. Inicia sesión normalmente.</span></div></div></section>',
  '<p class="foot">OceanHub · COMPANY GAMER STUDIOS · <a href="/privacidad">Privacidad</a> · <a href="/terminos">Términos</a></p></main>',
  '<script>const ua=navigator.userAgent||"";const isAndroid=/Android/i.test(ua);const isWindows=/Windows/i.test(ua);const windowsHint=document.getElementById("windowsHint");const androidHint=document.getElementById("androidHint");',
  '',
  '',
  'document.getElementById("installAndroid").addEventListener("click",()=>{window.location.href="/download/android";});if(isAndroid)windowsHint.textContent="Estás en Android. Para Windows, abre esta página en tu computadora.";else if(isWindows)androidHint.textContent="Estás en Windows. Para Android, abre esta página en tu teléfono.";fetch("/api/app/version",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>{if(v&&v.version)document.getElementById("version").textContent=v.version;}).catch(()=>{});if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{});',
  '</script></body></html>'
].join("");

export async function handleDownloadCenterRoute(request) {
  const path = new URL(request.url).pathname;
  if (!["/download", "/download/android", "/download/windows", "/api/app/version", "/app.webmanifest", "/sw.js", "/ocean-icon.svg"].includes(path)) return null;
  if (path === "/download/android") return Response.redirect(ANDROID_APK_RELEASE_URL, 302);
  if (path === "/download/windows") return Response.redirect(WINDOWS_EXE_RELEASE_URL, 302);
  if (path === "/api/app/version" && request.method === "OPTIONS") {
    const origin = request.headers.get("Origin") || "";
    if (!APP_VERSION_CORS_ORIGINS.has(origin)) {
      return new Response(null, { status: 403, headers: { "Cache-Control": "no-store", "Vary": "Origin" } });
    }
    const requestedMethod = (request.headers.get("Access-Control-Request-Method") || "GET").toUpperCase();
    const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") || "")
      .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    if (requestedMethod !== "GET" || requestedHeaders.some(header => header !== "accept")) {
      return new Response(null, { status: 403, headers: { "Cache-Control": "no-store", "Vary": "Origin" } });
    }
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    }});
  }
  if (request.method !== "GET") {
    const allow = path === "/api/app/version" ? "GET, OPTIONS" : "GET";
    return new Response("Method Not Allowed", { status: 405, headers: { "Allow": allow, "Cache-Control": "no-store" } });
  }
  if (path === "/api/app/version") {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = APP_VERSION_CORS_ORIGINS.has(origin)
      ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" }
      : { "Vary": "Origin" };
    return makeResponse(JSON.stringify(getAppVersionPayload()), "application/json; charset=utf-8", corsHeaders);
  }
  if (path === "/app.webmanifest") return makeResponse(MANIFEST, "application/manifest+json; charset=utf-8");
  if (path === "/sw.js") return makeResponse(SERVICE_WORKER, "application/javascript; charset=utf-8", { "Service-Worker-Allowed": "/", "Cache-Control": "no-cache" });
  if (path === "/ocean-icon.svg") return makeResponse(ICON, "image/svg+xml; charset=utf-8", { "Cache-Control": "public, max-age=86400" });
  return makeResponse(PAGE, "text/html; charset=utf-8");
}

export async function injectAppUpdateNotice(responseObject, enabled = true) {
  if (!enabled || !responseObject || !responseObject.headers.get("Content-Type")?.toLowerCase().includes("text/html")) return responseObject;
  if ([204, 205, 304].includes(responseObject.status)) return responseObject;
  const html = await responseObject.text();
  if (!/<\/body\s*>/i.test(html)) return new Response(html, { status: responseObject.status, statusText: responseObject.statusText, headers: responseObject.headers });
  const script = [
    '<script id="oceanhub-version-monitor">(()=>{',
    'const serverBuild=' + JSON.stringify(APP_VERSION) + ';let build=serverBuild;try{const q=new URLSearchParams(location.search).get("clientVersion");if(q&&/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-([0-9A-Za-z.-]+))?$/.test(q)){localStorage.setItem("oceanhubClientVersion",q);build=q;}else{const saved=localStorage.getItem("oceanhubClientVersion");if(saved&&/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-([0-9A-Za-z.-]+))?$/.test(saved))build=saved;}}catch(_){}',
    'const style="position:fixed;z-index:2147483000;left:16px;right:16px;top:16px;margin:auto;max-width:660px;padding:16px 18px;border-radius:18px;border:1px solid rgba(84,215,255,.35);background:rgba(5,20,35,.97);box-shadow:0 18px 70px rgba(0,0,0,.48);backdrop-filter:blur(18px);color:#eaf7ff;font:14px/1.5 system-ui,sans-serif";',
    'const button="border:0;border-radius:11px;padding:10px 14px;background:linear-gradient(100deg,#0bb8f4,#1665e8);color:white;font-weight:800;cursor:pointer";',
    'function cmp(a,b){const p=v=>{const m=String(v||"").match(/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-([0-9A-Za-z.-]+))?$/);return m?{n:m.slice(1,4).map(Number),p:m[4]||""}:null};const x=p(a),y=p(b);if(!x||!y)return 0;for(let i=0;i<3;i++){if(x.n[i]!==y.n[i])return x.n[i]<y.n[i]?-1:1;}if(x.p===y.p)return 0;if(!x.p)return 1;if(!y.p)return -1;return x.p<y.p?-1:1;}',
    'async function check(){try{const r=await fetch("/api/app/version",{cache:"no-store",headers:{"Accept":"application/json"}});if(!r.ok)return;const v=await r.json();const newer=cmp(v.version,build)>0;const required=cmp(build,v.minimumSupportedVersion)<0;if(!newer&&!required)return;if(document.getElementById("oceanhub-update-banner"))return;',
    'const box=document.createElement("section");box.id="oceanhub-update-banner";box.setAttribute("role","alertdialog");box.setAttribute("aria-live","assertive");box.style.cssText=style;',
    'const title=document.createElement("div");title.textContent="🌊 Tu versión de OceanHub quedó obsoleta";title.style.cssText="font-size:16px;font-weight:850;margin-bottom:5px";',
    'const msg=document.createElement("p");msg.textContent="Tu aplicación está obsoleta. Ya está disponible OceanHub "+v.version+". Te redirigiremos al centro oficial de descargas para instalar la nueva versión.";msg.style.cssText="margin:0 0 13px;color:#a9c6dd";',
    'const action=document.createElement("button");action.textContent="Descargar actualización ahora";action.style.cssText=button;action.addEventListener("click",()=>window.location.assign("/download"));',
    'box.append(title,msg,action);document.body.appendChild(box);setTimeout(()=>{if(document.visibilityState==="visible")window.location.assign("/download");},4000);',
    '}catch(_){}}if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{});check();setInterval(check,180000);window.addEventListener("focus",check);document.addEventListener("visibilitychange",()=>{if(!document.hidden)check();});})();</script>'
  ].join("");
  const updated = html.replace(/<\/body\s*>/i, script + "</body>");
  const headers = new Headers(responseObject.headers);
  headers.delete("Content-Length");
  headers.delete("content-length");
  return new Response(updated, { status: responseObject.status, statusText: responseObject.statusText, headers });
}
