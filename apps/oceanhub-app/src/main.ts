const OCEANHUB_WEB_URL = "https://oceanhud.yoelenmanuelzorrilla.workers.dev/";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("No se encontró el contenedor principal de OceanHub.");
}

// Fallback for local preview/build diagnostics only.
// Installed Tauri apps open OCEANHUB_WEB_URL directly via tauri.conf.json;
// the real pages, authentication, navigation and account data stay on the Worker.
appRoot.innerHTML = `
  <main class="web-launch-fallback">
    <div class="web-launch-mark" aria-hidden="true">O</div>
    <p class="web-launch-eyebrow">OCEANHUB EVERYWHERE</p>
    <h1>Abre OceanHub completo</h1>
    <p>La aplicación utiliza la web oficial de OceanHub para ofrecer las mismas páginas y funciones en Windows y Android.</p>
    <a class="web-launch-button" href="${OCEANHUB_WEB_URL}">Abrir OceanHub <span aria-hidden="true">↗</span></a>
    <p class="web-launch-note">Necesitas conexión a Internet. Tu cuenta y tus datos siguen protegidos por el servidor de OceanHub.</p>
  </main>
`;
