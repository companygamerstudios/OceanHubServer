(() => {
  "use strict";

  const OCEANHUB_HOST = "oceanhud.yoelenmanuelzorrilla.workers.dev";
  if (window.location.hostname !== OCEANHUB_HOST) return;
  if (window.__oceanhubStartupSplashInstalled) return;
  if (document.readyState === "complete") return;

  window.__oceanhubStartupSplashInstalled = true;

  const isAndroid = /Android/i.test(navigator.userAgent || "");
  const platformName = isAndroid ? "ANDROID APP" : "WINDOWS DESKTOP";
  const platformGlyph = isAndroid
    ? `
      <g fill="url(#glyph)" stroke="#9af7ff" stroke-width="2.2" stroke-linejoin="round">
        <path d="M57 71a23 23 0 0 1 46 0v5H57z" />
        <rect x="55" y="77" width="50" height="34" rx="7" />
        <rect x="45" y="80" width="8" height="29" rx="4" />
        <rect x="107" y="80" width="8" height="29" rx="4" />
        <rect x="64" y="108" width="9" height="18" rx="4.5" />
        <rect x="87" y="108" width="9" height="18" rx="4.5" />
        <path d="M65 56l-8-12M95 56l8-12" fill="none" stroke="#8ef5ff" stroke-width="4" stroke-linecap="round" />
      </g>
      <g fill="#03152f"><circle cx="70" cy="68" r="3"/><circle cx="90" cy="68" r="3"/></g>
    `
    : `
      <g fill="url(#glyph)" stroke="#9af7ff" stroke-width="1.5" stroke-linejoin="round">
        <path d="M54 59l32-5v31H54z" />
        <path d="M90 53l35-5v37H90z" />
        <path d="M54 91h32v31l-32-5z" />
        <path d="M90 91h35v38l-35-5z" />
      </g>
    `;

  let host = null;
  let shadow = null;
  let observer = null;
  let slowTimer = null;
  let dismissed = false;

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    if (slowTimer !== null) window.clearTimeout(slowTimer);
    if (observer) observer.disconnect();
    if (!host || !host.isConnected) return;
    host.classList.add("is-leaving");
    window.setTimeout(() => host && host.remove(), 460);
  };

  const mount = () => {
    const documentRoot = document.documentElement;
    if (!documentRoot || dismissed) return Boolean(documentRoot);
    if (document.getElementById("oceanhub-startup-splash")) return true;

    host = document.createElement("div");
    host.id = "oceanhub-startup-splash";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-label", `Cargando OceanHub para ${isAndroid ? "Android" : "Windows"}`);

    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: block;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          color: #effaff;
          font-family: Inter, "Segoe UI", system-ui, sans-serif;
        }
        .screen {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          overflow: hidden;
          isolation: isolate;
          background:
            radial-gradient(ellipse at 50% 42%, rgba(0, 110, 255, .23), transparent 32%),
            radial-gradient(ellipse at 12% 8%, rgba(0, 208, 255, .13), transparent 34%),
            linear-gradient(180deg, #02091b 0%, #04152c 58%, #020817 100%);
          opacity: 1;
          transition: opacity .42s ease, visibility .42s ease;
        }
        :host(.is-leaving) .screen { opacity: 0; visibility: hidden; }
        .stars, .stars::before, .stars::after {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 12% 24%, rgba(222, 252, 255, .9) 98%, transparent),
            radial-gradient(2px 2px at 29% 68%, rgba(99, 214, 255, .8) 98%, transparent),
            radial-gradient(1px 1px at 76% 22%, rgba(232, 255, 255, .9) 98%, transparent),
            radial-gradient(1px 1px at 87% 63%, rgba(102, 185, 255, .85) 98%, transparent),
            radial-gradient(2px 2px at 62% 78%, rgba(149, 237, 255, .6) 98%, transparent),
            radial-gradient(1px 1px at 43% 14%, rgba(255, 255, 255, .9) 98%, transparent);
          opacity: .7;
          animation: twinkle 4.5s ease-in-out infinite alternate;
        }
        .stars::before, .stars::after { content: ""; inset: -20%; }
        .stars::before { transform: scale(1.2); opacity: .45; animation-delay: -2s; }
        .stars::after { transform: scale(.8); opacity: .4; animation-delay: -3s; }
        .glow {
          position: absolute;
          width: min(74vw, 460px);
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 164, 255, .2), rgba(0, 92, 255, .07) 42%, transparent 70%);
          filter: blur(10px);
          animation: breathe 4s ease-in-out infinite;
        }
        .sea {
          position: absolute;
          left: -22%;
          bottom: -17%;
          width: 144%;
          height: 40%;
          border-top: 1px solid rgba(61, 206, 255, .35);
          border-radius: 50% 50% 0 0;
          background: linear-gradient(180deg, rgba(0, 118, 218, .14), rgba(1, 19, 49, .86));
          box-shadow: 0 -12px 45px rgba(0, 139, 255, .11);
          transform: rotate(-3deg);
          animation: sea-drift 8s ease-in-out infinite alternate;
        }
        .sea::before, .sea::after {
          content: "";
          position: absolute;
          left: -4%;
          top: -17px;
          width: 108%;
          height: 100%;
          border-top: 1px solid rgba(112, 230, 255, .18);
          border-radius: 50%;
        }
        .sea::after { top: -31px; opacity: .5; transform: translateX(4%); }
        .content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: min(90vw, 430px);
          padding: 30px 18px;
          text-align: center;
          transform: translateY(-1.5vh);
        }
        .logo-frame {
          position: relative;
          display: grid;
          place-items: center;
          width: clamp(154px, 42vw, 194px);
          aspect-ratio: 1;
          margin-bottom: 14px;
          filter: drop-shadow(0 0 24px rgba(0, 169, 255, .32));
        }
        .logo-frame::before {
          content: "";
          position: absolute;
          inset: 7%;
          border: 1px solid rgba(71, 208, 255, .23);
          border-radius: 50%;
          box-shadow: inset 0 0 35px rgba(0, 117, 255, .12), 0 0 38px rgba(0, 130, 255, .1);
        }
        .orbit {
          position: absolute;
          width: 123%;
          height: 42%;
          border: 2px solid transparent;
          border-top-color: rgba(160, 249, 255, .96);
          border-bottom-color: rgba(0, 126, 255, .8);
          border-radius: 50%;
          transform: rotate(-27deg);
          filter: drop-shadow(0 0 8px #08bfff);
          animation: orbit-spin 6.5s linear infinite;
        }
        .orbit::after {
          content: "";
          position: absolute;
          width: 9px;
          height: 9px;
          top: 5%;
          right: 16%;
          border-radius: 50%;
          background: #e8ffff;
          box-shadow: 0 0 10px 4px #22caff;
        }
        .logo {
          position: relative;
          z-index: 1;
          width: 82%;
          aspect-ratio: 1;
          animation: logo-float 3.6s ease-in-out infinite;
        }
        .crown {
          position: absolute;
          z-index: 2;
          top: -3%;
          width: 32%;
          height: 25%;
          filter: drop-shadow(0 0 8px rgba(115, 238, 255, .9));
          animation: crown-glow 2.8s ease-in-out infinite;
        }
        .brand {
          margin: 0;
          font-size: clamp(32px, 8vw, 42px);
          line-height: 1.08;
          font-weight: 850;
          letter-spacing: -.055em;
          background: linear-gradient(180deg, #fff 12%, #a5f4ff 56%, #48aaff 100%);
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 0 24px rgba(42, 178, 255, .15);
        }
        .platform {
          margin: 10px 0 28px;
          color: #6adfff;
          font-size: 10px;
          line-height: 1.4;
          font-weight: 800;
          letter-spacing: .25em;
        }
        .status {
          margin: 0 0 14px;
          color: #c3dff1;
          font-size: 13px;
          letter-spacing: .015em;
        }
        .progress {
          position: relative;
          width: min(56vw, 210px);
          height: 3px;
          overflow: hidden;
          border-radius: 99px;
          background: rgba(83, 154, 205, .2);
          box-shadow: 0 0 14px rgba(0, 168, 255, .15);
        }
        .progress::after {
          content: "";
          position: absolute;
          inset: 0 auto 0 -42%;
          width: 42%;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, #57eaff, #fff, transparent);
          box-shadow: 0 0 12px #25cfff;
          animation: progress 1.7s ease-in-out infinite;
        }
        .retry {
          margin-top: 18px;
          padding: 9px 17px;
          border: 1px solid rgba(88, 212, 255, .55);
          border-radius: 999px;
          background: rgba(8, 56, 97, .6);
          color: #e9fbff;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 0 20px rgba(0, 157, 255, .12);
        }
        .retry[hidden] { display: none; }
        .footer {
          margin-top: 35px;
          color: rgba(132, 179, 212, .48);
          font-size: 9px;
          font-weight: 750;
          letter-spacing: .24em;
        }
        @keyframes orbit-spin { to { transform: rotate(333deg); } }
        @keyframes logo-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes crown-glow { 0%,100% { opacity: .82; transform: translateY(0) scale(1); } 50% { opacity: 1; transform: translateY(-3px) scale(1.04); } }
        @keyframes breathe { 0%,100% { transform: scale(.92); opacity: .65; } 50% { transform: scale(1.08); opacity: 1; } }
        @keyframes twinkle { from { opacity: .35; } to { opacity: .88; } }
        @keyframes sea-drift { from { transform: translateX(-1.5%) rotate(-3deg); } to { transform: translateX(1.5%) rotate(-1deg); } }
        @keyframes progress { 0% { transform: translateX(0); } 100% { transform: translateX(340%); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
        }
      </style>
      <main class="screen">
        <div class="stars" aria-hidden="true"></div>
        <div class="glow" aria-hidden="true"></div>
        <div class="sea" aria-hidden="true"></div>
        <section class="content">
          <div class="logo-frame" aria-hidden="true">
            <div class="orbit"></div>
            <svg class="logo" viewBox="0 0 160 160" role="img" aria-label="OceanHub">
              <defs>
                <linearGradient id="planet" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#e9ffff"/>
                  <stop offset=".28" stop-color="#36e9ff"/>
                  <stop offset=".68" stop-color="#0877ff"/>
                  <stop offset="1" stop-color="#00dfff"/>
                </linearGradient>
                <linearGradient id="glyph" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#e9ffff"/>
                  <stop offset=".5" stop-color="#39e9ff"/>
                  <stop offset="1" stop-color="#2584ff"/>
                </linearGradient>
                <radialGradient id="core" cx="35%" cy="28%">
                  <stop stop-color="#123d86"/>
                  <stop offset="1" stop-color="#020d2c"/>
                </radialGradient>
              </defs>
              <circle cx="80" cy="80" r="61" fill="none" stroke="url(#planet)" stroke-width="13" stroke-dasharray="300 84" transform="rotate(32 80 80)" />
              <circle cx="80" cy="80" r="44" fill="url(#core)" stroke="#1475ec" stroke-width="2" />
              ${platformGlyph}
            </svg>
            <svg class="crown" viewBox="0 0 100 70" aria-hidden="true">
              <path d="M9 17 29 35 49 7 70 35 91 17 83 61H17Z" fill="#70eaff" stroke="#d8ffff" stroke-width="4" stroke-linejoin="round" />
              <path d="M19 49h62" stroke="#fff" stroke-width="4" stroke-linecap="round" />
            </svg>
          </div>
          <h1 class="brand">OceanHub</h1>
          <p class="platform">${platformName} · COMPANY GAMER STUDIOS</p>
          <p class="status" id="oceanhub-loading-status">Conectando con OceanHub…</p>
          <div class="progress" aria-hidden="true"></div>
          <button class="retry" id="oceanhub-loading-retry" type="button" hidden>Reintentar conexión</button>
          <span class="footer">TU COMUNIDAD · TU ESPACIO</span>
        </section>
      </main>
    `;
    documentRoot.appendChild(host);

    const retryButton = shadow.getElementById("oceanhub-loading-retry");
    retryButton.addEventListener("click", () => window.location.reload());

    slowTimer = window.setTimeout(() => {
      if (!host || !host.isConnected || dismissed) return;
      const status = shadow.getElementById("oceanhub-loading-status");
      if (status) status.textContent = "Tu conexión está lenta. Seguimos intentando…";
      retryButton.hidden = false;
    }, 10000);

    return true;
  };

  observer = new MutationObserver(() => {
    if (mount()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
  mount();

  window.addEventListener("load", () => window.setTimeout(dismiss, 280), { once: true });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) dismiss();
  }, { once: true });
})();
