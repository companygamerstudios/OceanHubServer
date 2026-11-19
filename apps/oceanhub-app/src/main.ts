import "./styles.css";

type ViewId = "home" | "social" | "air-flow" | "market" | "creator" | "command";

type ViewDefinition = {
  id: ViewId;
  label: string;
  icon: string;
  title: string;
  description: string;
  eyebrow: string;
  detail: string;
};

const VIEWS: ViewDefinition[] = [
  {
    id: "home",
    label: "Inicio",
    icon: "⌂",
    title: "Tu universo, en un solo lugar.",
    description: "OceanHub NEXUS es la nueva experiencia independiente de COMPANY GAMER STUDIOS.",
    eyebrow: "OCEANHUB NEXUS",
    detail: "El shell de escritorio y Android ya tiene una base visual propia. La conexión de cuenta y los módulos reales se incorporarán mediante contratos seguros."
  },
  {
    id: "social",
    label: "Social",
    icon: "◉",
    title: "Tu comunidad te espera.",
    description: "Feed, amigos, crews y mensajes dentro de una experiencia unificada.",
    eyebrow: "SOCIAL EVOLUTION",
    detail: "La interfaz está preparada. Los datos, privacidad y mensajes se conectarán después de validar la autenticación nativa y sus permisos."
  },
  {
    id: "air-flow",
    label: "Air Flow",
    icon: "✦",
    title: "Un espacio para crear y explorar.",
    description: "Air Flow conservará sus modos, proveedores y herramientas actuales.",
    eyebrow: "OCEANHUB AI",
    detail: "Proyectos, conversaciones, biblioteca y tareas Agent se añadirán sin sustituir el motor web existente."
  },
  {
    id: "market",
    label: "Market",
    icon: "◇",
    title: "Descubre el mercado OceanHub.",
    description: "Catálogo, pedidos y seguimiento con controles para compradores y vendedores.",
    eyebrow: "OCEAN MARKET",
    detail: "El catálogo y la tienda actuales se mantienen separados. Las operaciones de compra solo se conectarán después de verificar el flujo completo de pagos."
  },
  {
    id: "creator",
    label: "Creadores",
    icon: "✧",
    title: "Dale espacio a tus proyectos.",
    description: "Perfiles, páginas de juegos y novedades de creadores.",
    eyebrow: "CREATOR ECOSYSTEM",
    detail: "Las páginas públicas y las actualizaciones se integrarán respetando la propiedad de cada proyecto."
  },
  {
    id: "command",
    label: "Command",
    icon: "⌘",
    title: "Control operativo, con permisos.",
    description: "Herramientas administrativas disponibles solo para personal autorizado.",
    eyebrow: "OCEAN COMMAND",
    detail: "Los controles Staff seguirán validándose en el servidor. Esta app inicial no contiene operaciones administrativas."
  }
];

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("No se encontró el contenedor principal de OceanHub.");
}

function homeMarkup(): string {
  return `
    <section class="welcome-grid">
      <article class="hero-panel">
        <div class="hero-glow hero-glow-one"></div>
        <div class="hero-glow hero-glow-two"></div>
        <div class="hero-copy">
          <span class="eyebrow">OCEANHUB 3.0 · NEXUS</span>
          <h1>Tu mundo gamer.<br><span>Más conectado.</span></h1>
          <p>Una aplicación propia, diseñada para acompañar a tu comunidad en Windows y Android.</p>
          <div class="hero-actions">
            <button class="primary-button" type="button" data-action="learn">Explorar NEXUS <span>↗</span></button>
            <span class="hero-note"><i class="status-dot"></i> Shell independiente en desarrollo</span>
          </div>
        </div>
        <div class="orbital-art" aria-hidden="true">
          <div class="orbital-ring ring-a"></div>
          <div class="orbital-ring ring-b"></div>
          <div class="orbital-core"><span>O</span></div>
          <span class="orbit-chip chip-one">🌊</span>
          <span class="orbit-chip chip-two">✦</span>
          <span class="orbit-chip chip-three">◇</span>
        </div>
      </article>

      <article class="glass-card release-card">
        <div class="card-topline"><span class="eyebrow">CENTRO DE ACTUALIZACIONES</span><span class="subtle-icon">↻</span></div>
        <div class="release-symbol">✧</div>
        <h2>Siempre al día.</h2>
        <p>La verificación de versiones está prevista para detectar cuándo una versión requiere actualización.</p>
        <div class="release-status"><span class="status-pill status-pending">Preparación</span><span class="muted">Sin instalador nativo publicado</span></div>
        <button class="text-action" type="button" data-action="updates">Ver estado de actualizaciones <span>→</span></button>
      </article>
    </section>

    <section class="section-heading">
      <div><span class="eyebrow">TU ESPACIO</span><h2>OceanHub, por módulos.</h2></div>
      <span class="section-caption">Una sola aplicación · Experiencias conectadas</span>
    </section>

    <section class="module-grid" aria-label="Módulos de OceanHub">
      <button class="module-card module-blue" type="button" data-view="social">
        <span class="module-icon">◉</span><span class="module-meta">COMUNIDAD</span><strong>Ocean Social</strong><small>Feed · Friends · Crews · Messages</small><span class="module-arrow">↗</span>
      </button>
      <button class="module-card module-violet" type="button" data-view="air-flow">
        <span class="module-icon">✦</span><span class="module-meta">INTELIGENCIA</span><strong>Air Flow</strong><small>Tu espacio de trabajo con IA</small><span class="module-arrow">↗</span>
      </button>
      <button class="module-card module-cyan" type="button" data-view="market">
        <span class="module-icon">◇</span><span class="module-meta">DESCUBRIMIENTO</span><strong>Ocean Market</strong><small>Catálogo y actividad comercial</small><span class="module-arrow">↗</span>
      </button>
      <button class="module-card module-gold" type="button" data-view="creator">
        <span class="module-icon">✧</span><span class="module-meta">CREACIÓN</span><strong>Creator Ecosystem</strong><small>Proyectos y páginas de creadores</small><span class="module-arrow">↗</span>
      </button>
    </section>

    <section class="lower-grid">
      <article class="glass-card roadmap-card">
        <div class="card-topline"><span class="eyebrow">NEXUS ROADMAP</span><span class="muted">Fases progresivas</span></div>
        <h2>Construido para crecer.</h2>
        <p>La aplicación se conectará a los servicios existentes de OceanHub sin sustituir la web ni sus rutas.</p>
        <div class="roadmap-line">
          <div class="roadmap-step complete"><span>01</span><div><strong>Shell Ocean Glass</strong><small>Base visual independiente</small></div><b>✓</b></div>
          <div class="roadmap-step current"><span>02</span><div><strong>Compatibilidad y sesión</strong><small>Contratos y autenticación segura</small></div><b>En curso</b></div>
          <div class="roadmap-step"><span>03</span><div><strong>Módulos y actualizaciones</strong><small>Integración progresiva por capacidades</small></div><b>Después</b></div>
        </div>
      </article>
      <article class="glass-card platform-card">
        <div class="card-topline"><span class="eyebrow">OCEANHUB EVERYWHERE</span><span class="subtle-icon">⌘</span></div>
        <h2>Una identidad.<br>Varios dispositivos.</h2>
        <div class="platform-row"><span class="platform-logo">▣</span><div><strong>Windows</strong><small>Paquete nativo en preparación</small></div><span class="platform-state">Próximamente</span></div>
        <div class="platform-row"><span class="platform-logo">◧</span><div><strong>Android</strong><small>Paquete APK en preparación</small></div><span class="platform-state">Próximamente</span></div>
        <p class="small-print">Esta vista previa no es todavía un instalador ni una versión pública de la app.</p>
      </article>
    </section>
  `;
}

function moduleMarkup(view: ViewDefinition): string {
  return `
    <section class="module-welcome glass-card">
      <span class="eyebrow">${view.eyebrow}</span>
      <div class="module-hero-icon">${view.icon}</div>
      <h1>${view.title}</h1>
      <p>${view.description}</p>
      <div class="module-notice">
        <span class="notice-icon">✦</span>
        <div><strong>Integración por fases</strong><p>${view.detail}</p></div>
      </div>
      <button class="secondary-button" type="button" data-view="home">Volver al inicio</button>
    </section>
  `;
}

function renderShell(): string {
  const nav = VIEWS.map(view => `
    <button class="nav-item ${view.id === "home" ? "active" : ""}" type="button" data-view="${view.id}" aria-label="${view.label}" aria-current="${view.id === "home" ? "page" : "false"}">
      <span class="nav-icon" aria-hidden="true">${view.icon}</span>
      <span class="nav-label">${view.label}</span>
    </button>
  `).join("");

  return `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Navegación principal">
        <div class="brand-lockup">
          <div class="brand-mark"><span>O</span><i></i></div>
          <div><strong>OCEANHUB</strong><small>NEXUS · APP</small></div>
        </div>
        <div class="nav-group-label">ESPACIO</div>
        <nav class="primary-nav">${nav}</nav>
        <div class="sidebar-spacer"></div>
        <div class="sidebar-footer">
          <div class="build-mark"><i></i><span>APP PREVIEW</span></div>
          <small>3.0.0-preview.1</small>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <div class="mobile-brand"><span class="brand-mark small-mark">O</span><strong>OCEANHUB</strong></div>
          <div class="breadcrumb"><span>OceanHub</span><b>/</b><strong id="currentSection">Inicio</strong></div>
          <div class="topbar-actions">
            <span class="connection-chip"><i></i> Shell local</span>
            <button class="avatar-button" type="button" aria-label="Estado de cuenta no conectado">O</button>
          </div>
        </header>
        <div class="content-wrap">
          <div id="mainContent">${homeMarkup()}</div>
          <footer class="app-footer"><span>© COMPANY GAMER STUDIOS</span><span>OceanHub 3.0 · NEXUS Preview</span></footer>
        </div>
      </main>
      <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
    </div>
  `;
}

appRoot.innerHTML = renderShell();

function showToast(message: string): void {
  const toast = document.querySelector<HTMLDivElement>("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function activateView(viewId: string): void {
  const view = VIEWS.find(item => item.id === viewId) ?? VIEWS[0];
  const content = document.querySelector<HTMLDivElement>("#mainContent");
  const section = document.querySelector<HTMLElement>("#currentSection");
  if (!content || !section) return;

  content.innerHTML = view.id === "home" ? homeMarkup() : moduleMarkup(view);
  section.textContent = view.label;

  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(button => {
    const isActive = button.dataset.view === view.id;
    button.classList.toggle("active", isActive);
    if (button.classList.contains("nav-item")) {
      button.setAttribute("aria-current", isActive ? "page" : "false");
    }
  });
}

document.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const navButton = target.closest<HTMLElement>("[data-view]");
  if (navButton?.dataset.view) {
    activateView(navButton.dataset.view);
    return;
  }

  const actionButton = target.closest<HTMLElement>("[data-action]");
  if (!actionButton) return;

  if (actionButton.dataset.action === "learn") {
    showToast("NEXUS se conectará a las capacidades reales de OceanHub por fases.");
  } else if (actionButton.dataset.action === "updates") {
    showToast("Las actualizaciones nativas se activarán cuando existan paquetes firmados y verificados.");
  }
});
