// OceanHub Platform Suite
// Additive routes for operational tools. Existing community, events, notifications,
// Air Flow, XP and creator modules remain the source of truth for those capabilities.

const FEATURE_DEFINITIONS = Object.freeze([
  { id: "support_desk", label: "OceanHub Support Desk", description: "Tickets privados entre usuarios y OceanHub Staff." },
  { id: "marketplace", label: "OceanHub Marketplace", description: "Catálogo moderado de publicaciones de vendedores; no procesa pagos." },
  { id: "security_center", label: "OceanHub Security Center", description: "Revocación de otras sesiones sin revelar tokens." },
  { id: "reputation", label: "OceanHub Reputation", description: "Progreso basado en XP real y logros verificables." },
  { id: "developer_hub", label: "OceanHub Developer Hub", description: "Documentación y guías de integración." },
  { id: "launcher", label: "OceanHub Launcher", description: "Acceso centralizado a juegos, eventos y proyectos." },
  { id: "air_flow_workspace", label: "Air Flow Workspace", description: "Accesos y estado de configuración sin exponer secretos." },
  { id: "backup_center", label: "OceanHub Backup Center", description: "Procedimientos seguros; exportación cifrada aún no habilitada." }
]);

const DEFAULT_FLAGS = Object.freeze({
  support_desk: true,
  marketplace: true,
  security_center: true,
  reputation: true,
  developer_hub: true,
  launcher: true,
  air_flow_workspace: true,
  backup_center: true
});

const MAX_TICKETS_PER_USER = 30;
const MAX_TICKET_MESSAGES = 40;
const MAX_TICKET_BODY = 4000;
const MAX_LISTINGS_PER_SELLER = 20;
const MAX_MARKET_LISTINGS = 500;

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function page(title, body, options) {
  const opts = options || {};
  const back = opts.back || "/ocean";
  const admin = opts.admin ? '<span class="pill">OceanHub Staff</span>' : "";
  const html = [
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#061426"><title>', esc(title), ' · OceanHub</title>',
    '<style>',
    ':root{color-scheme:dark;--bg:#061426;--card:#0d2138;--line:rgba(110,190,255,.2);--text:#eaf6ff;--muted:#9ab4ce;--cyan:#5bd8ff;--blue:#238cff;--good:#65e6b1;--warn:#ffd27a}',
    '*{box-sizing:border-box}body{margin:0;padding:22px;background:radial-gradient(circle at 50% -15%,rgba(30,145,255,.22),transparent 46%),var(--bg);color:var(--text);font:15px/1.55 Inter,system-ui,Segoe UI,sans-serif}',
    'main{max-width:1120px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:20px}',
    'h1{font-size:clamp(27px,4vw,40px);margin:0}h2{font-size:19px;margin:0 0 10px}h3{font-size:16px;margin:0 0 8px}',
    'p{color:var(--muted)}a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:13px;margin:18px 0}',
    '.card{background:rgba(13,33,56,.92);border:1px solid var(--line);border-radius:17px;padding:17px;min-width:0}',
    '.muted{color:var(--muted);font-size:13px}.pill{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:4px 9px;color:var(--cyan);font-size:12px}',
    '.btn,button{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(85,190,255,.38);background:rgba(35,140,255,.15);color:var(--text);padding:9px 13px;border-radius:11px;font-weight:650;cursor:pointer;text-decoration:none}',
    '.btn:hover,button:hover{background:rgba(35,140,255,.28);text-decoration:none}.btn.secondary{background:transparent}',
    'input,textarea,select{display:block;width:100%;max-width:100%;margin:6px 0 13px;padding:11px;border-radius:10px;border:1px solid var(--line);background:#07182b;color:var(--text);font:inherit}',
    'textarea{min-height:120px;resize:vertical}label{display:block;color:var(--muted);font-size:13px;margin-top:8px}',
    'form{margin:10px 0}.row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}',
    '.item{padding:13px 0;border-top:1px solid var(--line)}.item:first-child{border-top:0}.status{color:var(--good);font-weight:700}.warning{color:var(--warn)}',
    '.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.notice{padding:13px;border:1px solid rgba(255,210,122,.3);border-radius:12px;background:rgba(255,190,60,.07);color:#ffe0a6}',
    '.check{display:flex;align-items:center;gap:9px;margin:10px 0}.check input{width:auto;margin:0}.footer{margin-top:30px;color:var(--muted);font-size:12px}',
    '@media(max-width:560px){body{padding:14px}.card{padding:14px}.top{align-items:flex-start}}',
    '</style></head><body><main><header class="top"><div><div class="muted">🌊 OCEANHUB PLATFORM SUITE</div><h1>', esc(title), '</h1></div><div class="actions">', admin,
    '<a class="btn secondary" href="', esc(back), '">← Volver</a><a class="btn secondary" href="/home">Inicio</a></div></header>',
    body,
    '<footer class="footer">OceanHub · Protegemos tus datos y mantenemos las funciones sujetas a permisos del servidor.</footer></main></body></html>'
  ].join("");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function redirect(request, path) {
  return new Response(null, { status: 303, headers: { Location: new URL(path, request.url).href, "Cache-Control": "no-store" } });
}

async function getJson(env, key, fallback) {
  const value = await env.STATS.get(key, "json");
  return value == null ? fallback : value;
}

async function putJson(env, key, value) {
  await env.STATS.put(key, JSON.stringify(value));
}

async function accountKey(email) {
  const bytes = new TextEncoder().encode(String(email || "").trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("").slice(0, 32);
}

function makeId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
}

async function runLocked(deps, env, key, callback) {
  if (typeof deps.withKVLock === "function") return deps.withKVLock(env, "ocean-suite:" + key, callback);
  return callback();
}

async function allowAction(deps, env, action, email, maximum, windowSeconds) {
  if (typeof deps.checkActionRateLimit !== "function") return true;
  return deps.checkActionRateLimit(env, "ocean-suite-" + action, email, maximum, windowSeconds);
}

async function isFeatureEnabled(env, id) {
  const flags = await getJson(env, "oh_suite_feature_flags", {});
  return Object.prototype.hasOwnProperty.call(flags, id) ? flags[id] === true : DEFAULT_FLAGS[id] === true;
}

async function getFeatureFlags(env) {
  const saved = await getJson(env, "oh_suite_feature_flags", {});
  const result = {};
  for (const definition of FEATURE_DEFINITIONS) {
    result[definition.id] = Object.prototype.hasOwnProperty.call(saved, definition.id)
      ? saved[definition.id] === true
      : DEFAULT_FLAGS[definition.id] === true;
  }
  return result;
}

async function updateIndex(env, indexKey, value, maximum, deps) {
  await runLocked(deps, env, "index:" + indexKey, async function () {
    const previous = await getJson(env, indexKey, []);
    const entries = Array.isArray(previous) ? previous : [];
    await putJson(env, indexKey, [value].concat(entries.filter(function (x) { return x !== value; })).slice(0, maximum));
  });
}

async function listIndexed(env, indexKey, maximum) {
  const entries = await getJson(env, indexKey, []);
  const keys = Array.isArray(entries) ? entries.slice(0, maximum) : [];
  const rows = [];
  for (const key of keys) {
    const value = await getJson(env, key, null);
    if (value) rows.push(value);
  }
  return rows;
}

async function notify(deps, env, email, payload) {
  if (typeof deps.socialPushNotif !== "function") return;
  try { await deps.socialPushNotif(env, email, payload); } catch (_) {}
}

async function listUserTickets(env, email) {
  const hash = await accountKey(email);
  const keys = await getJson(env, "oh_suite_user_tickets_" + hash, []);
  const rows = [];
  for (const key of (Array.isArray(keys) ? keys : []).slice(0, MAX_TICKETS_PER_USER)) {
    const ticket = await getJson(env, key, null);
    if (ticket) rows.push(ticket);
  }
  return rows;
}

async function createTicket(env, auth, form, deps) {
  const subject = String(form.get("subject") || "").trim().slice(0, 100);
  const body = String(form.get("body") || "").trim().slice(0, MAX_TICKET_BODY);
  const category = String(form.get("category") || "general");
  const allowedCategories = ["general", "account", "payments", "seller", "air-flow", "security", "report"];
  if (subject.length < 4 || body.length < 10 || !allowedCategories.includes(category)) return { error: "Completa el asunto y describe el problema con al menos 10 caracteres.", status: 400 };
  if (!(await allowAction(deps, env, "ticket-create", auth.user.email, 5, 3600))) return { error: "Has alcanzado el límite de 5 tickets por hora.", status: 429 };
  const email = String(auth.user.email || "").toLowerCase();
  const hash = await accountKey(email);
  const id = makeId();
  const key = "oh_suite_ticket_" + id;
  const now = new Date().toISOString();
  const ticket = {
    id: id,
    owner_hash: hash,
    owner_email: email,
    owner_name: String(auth.user.name || auth.user.username || email.split("@")[0]).slice(0, 80),
    subject: subject,
    category: category,
    status: "open",
    created_at: now,
    updated_at: now,
    messages: [{ author: "user", author_name: String(auth.user.name || "Usuario").slice(0, 80), body: body, created_at: now }]
  };
  await putJson(env, key, ticket);
  await updateIndex(env, "oh_suite_tickets_index", key, 500, deps);
  await updateIndex(env, "oh_suite_user_tickets_" + hash, key, MAX_TICKETS_PER_USER, deps);
  return { ticket: ticket };
}

async function addTicketReply(env, ticket, author, authorName, body) {
  const clean = String(body || "").trim().slice(0, MAX_TICKET_BODY);
  if (clean.length < 2) return false;
  ticket.messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  if (ticket.messages.length >= MAX_TICKET_MESSAGES) return false;
  ticket.messages.push({ author: author, author_name: String(authorName || author).slice(0, 80), body: clean, created_at: new Date().toISOString() });
  ticket.updated_at = new Date().toISOString();
  return true;
}

function renderTicket(ticket, options) {
  const opts = options || {};
  const messages = (Array.isArray(ticket.messages) ? ticket.messages : []).map(function (message) {
    return '<div class="item"><div class="row"><b>' + esc(message.author_name) + '</b><span class="muted">' + esc(new Date(message.created_at).toLocaleString("es-DO")) + '</span></div><p>' + esc(message.body).replace(/\n/g, "<br>") + '</p></div>';
  }).join("");
  const controls = opts.admin
    ? '<form method="post" action="/admin/ocean-support/' + esc(ticket.id) + '"><label>Estado</label><select name="status"><option value="open"' + (ticket.status === "open" ? " selected" : "") + '>Abierto</option><option value="in_progress"' + (ticket.status === "in_progress" ? " selected" : "") + '>En revisión</option><option value="closed"' + (ticket.status === "closed" ? " selected" : "") + '>Resuelto</option></select><label>Respuesta de OceanHub Staff</label><textarea name="reply" maxlength="' + MAX_TICKET_BODY + '" placeholder="Escribe una respuesta (opcional)"></textarea><button>Guardar actualización</button></form>'
    : (ticket.status !== "closed" ? '<form method="post" action="/ocean/support/' + esc(ticket.id) + '/reply"><label>Responder</label><textarea name="body" maxlength="' + MAX_TICKET_BODY + '" required></textarea><button>Enviar respuesta</button></form>' : '<p class="muted">Este ticket está cerrado.</p>');
  return '<section class="card"><div class="row"><h3>#' + esc(ticket.id.slice(0, 8)) + ' · ' + esc(ticket.subject) + '</h3><span class="pill">' + esc(ticket.status) + '</span></div><p class="muted">' + esc(ticket.category) + ' · ' + esc(ticket.owner_name || "Usuario") + (opts.admin ? " · " + esc(ticket.owner_email) : "") + ' · ' + esc(new Date(ticket.created_at).toLocaleString("es-DO")) + '</p>' + messages + controls + '</section>';
}

async function handleSupport(request, env, auth, deps, url) {
  if (!(await isFeatureEnabled(env, "support_desk"))) return json({ error: "Módulo desactivado" }, 404);
  if (request.method === "GET" && url.pathname === "/ocean/support") {
    if (!(await isFeatureEnabled(env, "support_desk"))) return page("Soporte desactivado", '<p>OceanHub Support Desk está temporalmente desactivado.</p>');
    const tickets = await listUserTickets(env, auth.user.email);
    const cards = tickets.map(function (ticket) { return renderTicket(ticket, { admin: false }); }).join("");
    return page("OceanHub Support Desk", '<p>Abre un ticket privado y sigue las respuestas del equipo de OceanHub Staff.</p><section class="card"><h2>Crear ticket</h2><form method="post" action="/ocean/support"><label>Asunto</label><input name="subject" maxlength="100" minlength="4" required><label>Categoría</label><select name="category"><option value="general">General</option><option value="account">Cuenta</option><option value="payments">Pagos</option><option value="seller">Vendedores</option><option value="air-flow">Air Flow</option><option value="security">Seguridad</option><option value="report">Reportar contenido</option></select><label>Describe lo ocurrido</label><textarea name="body" minlength="10" maxlength="' + MAX_TICKET_BODY + '" required></textarea><button>Enviar ticket</button></form></section><h2 style="margin-top:22px">Mis tickets</h2>' + (cards || '<section class="card"><p>Aún no tienes tickets.</p></section>'));
  }
  if (url.pathname === "/ocean/support" && request.method === "POST") {
    const form = await request.formData();
    const result = await createTicket(env, auth, form, deps);
    if (result.error) return page("No se pudo crear el ticket", '<section class="card"><p class="warning">' + esc(result.error) + '</p><a class="btn" href="/ocean/support">Volver</a></section>');
    return redirect(request, "/ocean/support");
  }
  const replyMatch = url.pathname.match(/^\/ocean\/support\/([a-f0-9]{32})\/reply$/);
  if (replyMatch && request.method === "POST") {
    const form = await request.formData();
    const ticket = await getJson(env, "oh_suite_ticket_" + replyMatch[1], null);
    const hash = await accountKey(auth.user.email);
    if (!ticket || ticket.owner_hash !== hash) return json({ error: "Ticket no encontrado" }, 404);
    if (ticket.status === "closed") return json({ error: "El ticket está cerrado" }, 409);
    if (!(await allowAction(deps, env, "ticket-reply", auth.user.email, 20, 3600))) return json({ error: "Demasiadas respuestas" }, 429);
    if (!(await addTicketReply(env, ticket, "user", auth.user.name || "Usuario", form.get("body")))) return json({ error: "La respuesta está vacía o el ticket alcanzó su límite." }, 400);
    await putJson(env, "oh_suite_ticket_" + replyMatch[1], ticket);
    return redirect(request, "/ocean/support");
  }
  return null;
}

async function handleAdminSupport(request, env, deps, url) {
  const list = await listIndexed(env, "oh_suite_tickets_index", 500);
  const match = url.pathname.match(/^\/admin\/ocean-support\/([a-f0-9]{32})$/);
  if (match && request.method === "POST") {
    const ticket = await getJson(env, "oh_suite_ticket_" + match[1], null);
    if (!ticket) return json({ error: "Ticket no encontrado" }, 404);
    const form = await request.formData();
    const status = String(form.get("status") || ticket.status);
    if (!["open", "in_progress", "closed"].includes(status)) return json({ error: "Estado no válido" }, 400);
    ticket.status = status;
    const reply = String(form.get("reply") || "").trim();
    if (reply && !(await addTicketReply(env, ticket, "staff", "OceanHub Staff", reply))) return json({ error: "No se pudo guardar la respuesta." }, 400);
    ticket.updated_at = new Date().toISOString();
    await putJson(env, "oh_suite_ticket_" + match[1], ticket);
    if (reply) await notify(deps, env, ticket.owner_email, { type: "support_reply", title: "Nueva respuesta de OceanHub Support", body: "OceanHub Staff respondió a tu ticket: " + ticket.subject, href: "/ocean/support" });
    return redirect(request, "/admin/ocean-support");
  }
  return page("Support Desk · Administración", '<p>Tickets visibles solo para OceanHub Staff. Las respuestas se envían al centro privado del propietario.</p>' + (list.map(function (ticket) { return renderTicket(ticket, { admin: true }); }).join("") || '<section class="card"><p>No hay tickets registrados.</p></section>'), { admin: true });
}

async function listMarketListings(env, includePending) {
  const keys = await getJson(env, "oh_suite_market_index", []);
  const rows = [];
  for (const key of (Array.isArray(keys) ? keys : []).slice(0, MAX_MARKET_LISTINGS)) {
    const listing = await getJson(env, key, null);
    if (listing && (includePending || listing.status === "approved")) rows.push(listing);
  }
  return rows;
}

async function handleMarket(request, env, auth, deps, url) {
  if (!(await isFeatureEnabled(env, "marketplace"))) return json({ error: "Módulo desactivado" }, 404);
  if (request.method === "GET" && url.pathname === "/ocean/market") {
    if (!(await isFeatureEnabled(env, "marketplace"))) return page("Marketplace desactivado", '<p>OceanHub Marketplace está temporalmente desactivado.</p>');
    const listings = await listMarketListings(env, false);
    const isSeller = auth.user.role === "reseller";
    const form = isSeller ? '<section class="card"><h2>Publicar en el catálogo</h2><p>Las publicaciones pasan por revisión de OceanHub Staff antes de aparecer públicamente.</p><form method="post" action="/ocean/market"><label>Nombre del producto</label><input name="title" maxlength="80" minlength="4" required><label>Categoría</label><select name="category"><option value="digital">Producto digital</option><option value="service">Servicio</option><option value="game">Videojuegos</option><option value="other">Otro</option></select><label>Descripción</label><textarea name="description" maxlength="2000" minlength="20" required></textarea><label>Precio anunciado (USD)</label><input type="number" name="price" min="0.50" max="5000" step="0.01" required><button>Enviar a revisión</button></form></section>' : '<section class="card"><p>El catálogo está abierto para explorar. Para publicar, debes tener el rol OceanHub Seller.</p></section>';
    const cards = listings.map(function (item) { return '<section class="card"><div class="row"><h3>' + esc(item.title) + '</h3><span class="pill">$' + Number(item.price).toFixed(2) + ' USD</span></div><p>' + esc(item.description) + '</p><p class="muted">' + esc(item.category) + ' · Publicado por @' + esc(item.seller_name) + '</p></section>'; }).join("");
    return page("OceanHub Marketplace", '<div class="notice">El catálogo no cobra ni procesa pedidos todavía. No envíes dinero ni datos de pago a través de publicaciones. El checkout se activará solo después de integrar y probar el flujo oficial de PayPal.</div>' + form + '<h2 style="margin-top:22px">Catálogo aprobado</h2><div class="grid">' + (cards || '<section class="card"><p>Aún no hay publicaciones aprobadas.</p></section>') + '</div>');
  }
  if (url.pathname === "/ocean/market" && request.method === "POST") {
    if (auth.user.role !== "reseller") return json({ error: "Solo las cuentas OceanHub Sellers pueden publicar." }, 403);
    if (!(await allowAction(deps, env, "market-create", auth.user.email, 5, 3600))) return json({ error: "Límite de publicaciones alcanzado." }, 429);
    const form = await request.formData();
    const title = String(form.get("title") || "").trim().slice(0, 80);
    const description = String(form.get("description") || "").trim().slice(0, 2000);
    const category = String(form.get("category") || "other");
    const price = Number(form.get("price"));
    if (title.length < 4 || description.length < 20 || !["digital", "service", "game", "other"].includes(category) || !Number.isFinite(price) || price < 0.5 || price > 5000) return json({ error: "Revisa el nombre, descripción, categoría y precio (USD 0.50–5000)." }, 400);
    const sellerHash = await accountKey(auth.user.email);
    const listings = await listMarketListings(env, true);
    if (listings.filter(function (item) { return item.seller_hash === sellerHash; }).length >= MAX_LISTINGS_PER_SELLER) return json({ error: "Has alcanzado el máximo de publicaciones activas." }, 429);
    const id = makeId();
    const key = "oh_suite_listing_" + id;
    const item = { id: id, seller_hash: sellerHash, seller_email: String(auth.user.email).toLowerCase(), seller_name: String(auth.user.username || auth.user.name || "Ocean Seller").replace(/^@/, "").slice(0, 32), title: title, description: description, category: category, price: Math.round(price * 100) / 100, status: "pending", created_at: new Date().toISOString() };
    await putJson(env, key, item);
    await updateIndex(env, "oh_suite_market_index", key, MAX_MARKET_LISTINGS, deps);
    return redirect(request, "/ocean/market");
  }
  return null;
}

async function handleAdminMarket(request, env, deps, url) {
  const match = url.pathname.match(/^\/admin\/ocean-market\/([a-f0-9]{32})$/);
  if (match && request.method === "POST") {
    const item = await getJson(env, "oh_suite_listing_" + match[1], null);
    if (!item) return json({ error: "Publicación no encontrada" }, 404);
    const form = await request.formData();
    const decision = String(form.get("decision") || "");
    if (!["approved", "rejected"].includes(decision)) return json({ error: "Decisión no válida" }, 400);
    item.status = decision;
    item.reviewed_at = new Date().toISOString();
    await putJson(env, "oh_suite_listing_" + match[1], item);
    await notify(deps, env, item.seller_email, { type: "market_review", title: decision === "approved" ? "Publicación aprobada" : "Publicación revisada", body: "Tu publicación «" + item.title + "» fue " + (decision === "approved" ? "aprobada" : "rechazada") + " por OceanHub Staff.", href: "/ocean/market" });
    return redirect(request, "/admin/ocean-market");
  }
  const listings = await listMarketListings(env, true);
  const cards = listings.filter(function (item) { return item.status === "pending"; }).map(function (item) {
    return '<section class="card"><div class="row"><h3>' + esc(item.title) + '</h3><span class="pill">$' + Number(item.price).toFixed(2) + ' USD</span></div><p>' + esc(item.description) + '</p><p class="muted">Vendedor: ' + esc(item.seller_email) + ' · ' + esc(item.category) + '</p><div class="actions"><form method="post" action="/admin/ocean-market/' + esc(item.id) + '"><input type="hidden" name="decision" value="approved"><button>Aprobar</button></form><form method="post" action="/admin/ocean-market/' + esc(item.id) + '"><input type="hidden" name="decision" value="rejected"><button class="secondary">Rechazar</button></form></div></section>';
  }).join("");
  return page("Marketplace · Moderación", '<p>Revisa cada publicación antes de hacerla visible. No se realizan cobros desde este módulo.</p>' + (cards || '<section class="card"><p>No hay publicaciones pendientes.</p></section>'), { admin: true });
}

async function handleSecurity(request, env, auth, deps, url) {
  if (!(await isFeatureEnabled(env, "security_center"))) return json({ error: "Módulo desactivado" }, 404);
  if (url.pathname === "/ocean/security" && request.method === "GET") {
    if (!(await isFeatureEnabled(env, "security_center"))) return page("Security Center desactivado", '<p>Este módulo está temporalmente desactivado.</p>');
    const session = await getJson(env, "session_" + auth.sessionToken, {});
    return page("OceanHub Security Center", '<section class="card"><h2>Sesión actual</h2><p>Cuenta: <b>' + esc(auth.user.email) + '</b></p><p>Rol: ' + esc(auth.user.role) + '</p><p>Iniciada: ' + esc(session.created ? new Date(session.created).toLocaleString("es-DO") : "No disponible") + '</p><span class="status">Sesión actual autenticada</span></section><section class="card"><h2>Proteger mi cuenta</h2><p>La acción siguiente invalida las demás sesiones de tu cuenta y mantiene esta sesión activa. No muestra ni comparte tokens.</p><form method="post" action="/ocean/security/revoke-others"><button>🔒 Cerrar las demás sesiones</button></form><p class="muted">También puedes revisar la configuración de 2FA en tu perfil y cerrar esta sesión desde el menú de cuenta.</p></section>');
  }
  if (url.pathname === "/ocean/security/revoke-others" && request.method === "POST") {
    if (typeof deps.revokeOtherSessions !== "function") return json({ error: "La revocación de sesiones no está disponible." }, 503);
    const ok = await deps.revokeOtherSessions(env, auth);
    return page("Sesiones protegidas", '<section class="card"><p class="status">' + (ok ? "Las demás sesiones han quedado invalidadas." : "No se pudo completar la revocación.") + '</p><a class="btn" href="/ocean/security">Volver a seguridad</a></section>');
  }
  return null;
}

function getAchievementRows(xp, role) {
  const rows = [
    { title: "First Wave", threshold: 0, description: "Tu cuenta forma parte de OceanHub." },
    { title: "Ocean Explorer", threshold: 100, description: "Alcanza 100 Ocean XP." },
    { title: "Deep Diver", threshold: 500, description: "Alcanza 500 Ocean XP." },
    { title: "Ocean Legend", threshold: 2000, description: "Alcanza 2.000 Ocean XP." }
  ];
  if (role === "reseller") rows.push({ title: "Ocean Seller", threshold: 0, description: "Cuenta con rol OceanHub Sellers." });
  return rows.map(function (item) {
    const earned = item.title === "Ocean Seller" ? role === "reseller" : Number(xp) >= item.threshold;
    return '<div class="item"><div class="row"><b>' + esc(item.title) + '</b><span class="pill">' + (earned ? "Desbloqueado" : "Bloqueado") + '</span></div><p class="muted">' + esc(item.description) + '</p></div>';
  }).join("");
}

async function handleReputation(request, env, auth, deps) {
  if (!(await isFeatureEnabled(env, "reputation"))) return page("Reputation desactivado", '<p>Este módulo está temporalmente desactivado.</p>');
  const state = typeof deps.communityXpState === "function" ? await deps.communityXpState(env, auth.user.email) : { xp: 0, season: { xp: 0 } };
  const xp = Math.max(0, Number(state.xp) || 0);
  const level = Math.floor(Math.sqrt(xp / 25)) + 1;
  return page("OceanHub Reputation", '<section class="grid"><div class="card"><div class="muted">OCEAN XP TOTAL</div><h1>' + xp.toLocaleString("es-DO") + '</h1></div><div class="card"><div class="muted">NIVEL ESTIMADO</div><h1>' + level + '</h1></div><div class="card"><div class="muted">XP DE TEMPORADA</div><h1>' + Math.max(0, Number(state.season && state.season.xp) || 0).toLocaleString("es-DO") + '</h1></div></section><section class="card"><h2>Logros</h2>' + getAchievementRows(xp, auth.user.role) + '</section><p class="muted">La reputación es transparente y positiva: se basa en XP registrado y roles reales. No se usa como sanción ni como evaluación automática de usuarios.</p><a class="btn" href="/ocean-xp">Abrir Ocean XP</a>');
}

async function countPrefix(env, prefix, maxPages) {
  let cursor;
  let count = 0;
  for (let pageNo = 0; pageNo < (maxPages || 2); pageNo++) {
    const args = { prefix: prefix, limit: 1000 };
    if (cursor) args.cursor = cursor;
    const result = await env.STATS.list(args);
    count += (result.keys || []).length;
    if (result.list_complete || !result.cursor) break;
    cursor = result.cursor;
  }
  return count;
}

async function handleCommandCenter(request, env, deps) {
  const stats = typeof deps.getStats === "function" ? await deps.getStats(env) : {};
  const tickets = await listIndexed(env, "oh_suite_tickets_index", 500);
  const listings = await listMarketListings(env, true);
  const pendingTickets = tickets.filter(function (ticket) { return ticket.status !== "closed"; }).length;
  const pendingListings = listings.filter(function (item) { return item.status === "pending"; }).length;
  const totalUsers = await countPrefix(env, "user_", 2).catch(function () { return 0; });
  const keys = [
    ["KV / estadísticas", !!env.STATS],
    ["Durable Object", !!env.KV_LOCKER],
    ["Gemini", !!env.GEMINI_API_KEY],
    ["OpenRouter", !!env.OPENROUTER_API_KEY],
    ["Stable Horde", !!env.STABLE_HORDE_API_KEY],
    ["Brevo", !!env.BREVO_API_KEY]
  ];
  const cards = keys.map(function (item) { return '<div class="card"><div class="row"><b>' + esc(item[0]) + '</b><span class="' + (item[1] ? "status" : "warning") + '">' + (item[1] ? "Configurado" : "No configurado") + '</span></div></div>'; }).join("");
  return page("OceanHub Command Center", '<div class="grid"><div class="card"><div class="muted">CUENTAS REGISTRADAS</div><h1>' + totalUsers + '</h1></div><div class="card"><div class="muted">TICKETS ABIERTOS</div><h1>' + pendingTickets + '</h1><a href="/admin/ocean-support">Gestionar soporte →</a></div><div class="card"><div class="muted">PUBLICACIONES PENDIENTES</div><h1>' + pendingListings + '</h1><a href="/admin/ocean-market">Revisar catálogo →</a></div><div class="card"><div class="muted">VERIFICACIONES REGISTRADAS</div><h1>' + Math.max(0, Number(stats.total_verifications) || 0) + '</h1></div></div><h2>Servicios y bindings</h2><div class="grid">' + cards + '</div><section class="card"><h2>Operaciones</h2><div class="actions"><a class="btn" href="/admin/ocean-features">Feature Control</a><a class="btn" href="/admin/ocean-support">Support Desk</a><a class="btn" href="/admin/ocean-market">Marketplace</a><a class="btn" href="/admin/ocean-backups">Backup Center</a><a class="btn secondary" href="/status">Estado público</a></div></section><p class="muted">Este panel informa solo métricas y presencia de configuración. No lee ni muestra valores secretos, ni sustituye Cloudflare Observability.</p>', { admin: true });
}

async function handleFeatures(request, env, deps) {
  const current = await getFeatureFlags(env);
  if (request.method === "POST") {
    const form = await request.formData();
    const next = {};
    for (const definition of FEATURE_DEFINITIONS) next[definition.id] = form.get(definition.id) === "on";
    await putJson(env, "oh_suite_feature_flags", next);
    return redirect(request, "/admin/ocean-features");
  }
  const fields = FEATURE_DEFINITIONS.map(function (definition) {
    return '<label class="check"><input type="checkbox" name="' + esc(definition.id) + '"' + (current[definition.id] ? " checked" : "") + '> <span><b>' + esc(definition.label) + '</b><br><small class="muted">' + esc(definition.description) + '</small></span></label>';
  }).join("");
  return page("OceanHub Feature Control", '<section class="card"><p>Activa o pausa los módulos nuevos de OceanHub Suite. Los módulos existentes (Feed, Game Party, Events, Ocean XP, Air Flow y Creator Studio) conservan sus propios controles.</p><form method="post" action="/admin/ocean-features">' + fields + '<button>Guardar configuración</button></form></section>', { admin: true });
}

async function handleBackupCenter(env) {
  if (!(await isFeatureEnabled(env, "backup_center"))) return page("Backup Center desactivado", "<p>Este módulo está temporalmente desactivado.</p>");
  const totalUsers = await countPrefix(env, "user_", 2).catch(function () { return 0; });
  return page("OceanHub Backup Center", '<div class="notice">Las copias de seguridad automáticas no están activas. Esta instalación no depende de R2 y esta pantalla no exporta contraseñas, sesiones, datos privados ni secretos.</div><section class="card"><h2>Estado actual</h2><p>Cuentas detectadas en el índice KV: ' + totalUsers + '</p><p class="warning">No existe una copia restaurable completa desde este panel.</p></section><section class="card"><h2>Ruta segura para habilitar backups</h2><ol><li>Elegir un destino externo independiente (sin obligar a usar R2).</li><li>Definir cifrado autenticado con una clave de recuperación fuera de Cloudflare.</li><li>Excluir sesiones y secretos; validar integridad antes de almacenar.</li><li>Probar restauración en un entorno aislado antes de producción.</li><li>Registrar responsable, fecha, retención y resultado de cada restauración.</li></ol></section><p class="muted">No se habilita un botón de exportación inseguro: una copia de KV puede contener credenciales, hashes y datos personales.</p>', { admin: true });
}

function linkCard(title, description, href, label) {
  return '<section class="card"><h2>' + esc(title) + '</h2><p>' + esc(description) + '</p><div class="actions"><a class="btn" href="' + esc(href) + '">' + esc(label || "Abrir") + ' →</a></div></section>';
}

async function handleOceanHome(env, auth) {
  const flags = await getFeatureFlags(env);
  const sections = [
    linkCard("Notificaciones", "Avisos sociales, invitaciones y actividad.", "/notifications"),
    linkCard("Comunidad", "Feed, amigos, grupos y conversaciones.", "/feed"),
    linkCard("Eventos y torneos", "Calendario, Game Party y Ocean Arena.", "/events"),
    linkCard("Ocean XP", "Temporadas, experiencia y progreso.", "/ocean-xp"),
    flags.support_desk ? linkCard("Support Desk", "Abre tickets privados y consulta respuestas.", "/ocean/support") : "",
    flags.marketplace ? linkCard("Marketplace", "Explora publicaciones aprobadas de OceanHub Sellers.", "/ocean/market") : "",
    flags.security_center ? linkCard("Security Center", "Protege tu cuenta y cierra otras sesiones.", "/ocean/security") : "",
    flags.reputation ? linkCard("Reputation", "Consulta XP y logros basados en progreso real.", "/ocean/reputation") : "",
    flags.launcher ? linkCard("Launcher", "Descubre proyectos y herramientas de la comunidad.", "/ocean/launcher") : "",
    flags.developer_hub ? linkCard("Developer Hub", "Documentación y buenas prácticas.", "/ocean/developers") : "",
    flags.air_flow_workspace ? linkCard("Air Flow Workspace", "Abre el asistente y gestiona tus borradores.", "/ocean/air-flow") : "",
    linkCard("Estado de OceanHub", "Consulta el estado público del servicio.", "/status")
  ].filter(Boolean).join("");
  const staff = auth.user.role === "admin" ? '<section class="card"><h2>OceanHub Staff</h2><p>Centro de operaciones y controles administrativos.</p><div class="actions"><a class="btn" href="/admin/ocean-command">Command Center</a><a class="btn" href="/admin/ocean-features">Feature Control</a><a class="btn" href="/admin/ocean-support">Support Desk</a><a class="btn" href="/admin/ocean-market">Marketplace</a></div></section>' : "";
  return page("OceanHub Suite", '<p>Un solo punto de entrada a las herramientas de la comunidad, vendedores, creadores y administración.</p><div class="grid">' + sections + '</div>' + staff);
}

async function handleAirFlowWorkspace(env) {
  const providers = [
    ["Gemini", !!env.GEMINI_API_KEY],
    ["OpenRouter", !!env.OPENROUTER_API_KEY],
    ["Stable Horde", !!env.STABLE_HORDE_API_KEY]
  ].map(function (item) { return '<div class="item row"><b>' + esc(item[0]) + '</b><span class="' + (item[1] ? "status" : "warning") + '">' + (item[1] ? "Configurado" : "No configurado") + '</span></div>'; }).join("");
  return page("Air Flow Workspace", '<section class="card"><h2>Tu espacio de IA</h2><p>El motor Air Flow y Air Flow Studio siguen siendo los módulos principales; este espacio los reúne sin duplicar proveedores ni guardar copias de prompts.</p><div class="actions"><a class="btn" href="/air-flow">Abrir Air Flow</a><a class="btn secondary" href="/air-flow-studio">Abrir Air Flow Studio</a></div></section><section class="card"><h2>Estado de configuración</h2>' + providers + '</section><div class="notice">Los prompts, archivos y contexto pueden procesarse en proveedores externos según el modo seleccionado. No introduzcas contraseñas ni datos sensibles.</div>');
}

async function handleDeveloperHub() {
  return page("OceanHub Developer Hub", '<div class="grid">' +
    linkCard("Integraciones", "Usa exclusivamente endpoints públicos documentados y permisos mínimos.", "/status") +
    linkCard("Buenas prácticas", "No publiques secretos, tokens, cookies ni credenciales en repositorios.", "https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning", "Guía de GitHub") +
    linkCard("Cloudflare Workers", "Consulta documentación de runtime, bindings, despliegues y límites.", "https://developers.cloudflare.com/workers/", "Documentación oficial") +
    linkCard("Cambios del proyecto", "Consulta el código y los cambios publicados de OceanHubServer.", "https://github.com/companygamerstudios/OceanHubServer", "Abrir GitHub") +
    '</div><section class="card"><h2>Reglas para contribuir</h2><ul><li>Trabaja en una rama y abre un Pull Request.</li><li>No incluyas valores de Secrets ni archivos .dev.vars.</li><li>Añade pruebas para rutas, permisos y límites.</li><li>Comprueba sintaxis, tests y dry-run antes de publicar.</li></ul></section>');
}

async function handleLauncher() {
  return page("OceanHub Launcher", '<p>Acceso rápido a juegos, proyectos, actividades y herramientas creadas por la comunidad.</p><div class="grid">' +
    linkCard("Creator Studio", "Publica y administra tus proyectos de creador.", "/creator-studio") +
    linkCard("Ocean Arena", "Participa u organiza torneos de la comunidad.", "/arena") +
    linkCard("Game Party", "Crea salas públicas o privadas e invita a tus amigos.", "/parties") +
    linkCard("Ocean Events", "Descubre eventos y actividades próximas.", "/events") +
    linkCard("Community Feed", "Novedades y publicaciones de los usuarios.", "/feed") +
    linkCard("Air Flow", "Herramientas de inteligencia artificial de OceanHub.", "/air-flow") +
    '</div><p class="muted">El Launcher centraliza proyectos existentes; no anuncia juegos ni descargas que todavía no estén publicados.</p>');
}

export async function handleOceanSuiteRoute(request, env, deps) {
  const url = new URL(request.url);
  const path = url.pathname;
  const auth = await deps.requireAuth(env, request);
  if (!auth) return null;

  if (path === "/ocean") return request.method === "GET" ? handleOceanHome(env, auth) : json({ error: "Método no permitido" }, 405);
  if (path === "/ocean/notifications") return Response.redirect(new URL("/notifications", request.url).href, 302);
  if (path === "/ocean/social") return Response.redirect(new URL("/feed", request.url).href, 302);
  if (path === "/ocean/events") return Response.redirect(new URL("/events", request.url).href, 302);
  if (path === "/ocean/status") return Response.redirect(new URL("/status", request.url).href, 302);
  if (path === "/ocean/launcher" && request.method === "GET") return (await isFeatureEnabled(env, "launcher")) ? handleLauncher() : page("Launcher desactivado", "<p>Este módulo está temporalmente desactivado.</p>");
  if (path === "/ocean/developers" && request.method === "GET") return (await isFeatureEnabled(env, "developer_hub")) ? handleDeveloperHub() : page("Developer Hub desactivado", "<p>Este módulo está temporalmente desactivado.</p>");
  if (path === "/ocean/air-flow" && request.method === "GET") return (await isFeatureEnabled(env, "air_flow_workspace")) ? handleAirFlowWorkspace(env) : page("Air Flow Workspace desactivado", "<p>Este módulo está temporalmente desactivado.</p>");
  if (path === "/ocean/reputation" && request.method === "GET") return handleReputation(request, env, auth, deps);
  if (path === "/ocean/security" || path === "/ocean/security/revoke-others") return handleSecurity(request, env, auth, deps, url);
  if (path === "/ocean/support" || /^\/ocean\/support\/[a-f0-9]{32}\/reply$/.test(path)) return handleSupport(request, env, auth, deps, url);
  if (path === "/ocean/market") return handleMarket(request, env, auth, deps, url);

  if (path.startsWith("/admin/ocean-")) {
    const admin = await deps.requireAdmin(env, request);
    if (!admin) return json({ error: "No autorizado" }, 403);
    if (path === "/admin/ocean-command" && request.method === "GET") return handleCommandCenter(request, env, deps);
    if (path === "/admin/ocean-features") return handleFeatures(request, env, deps);
    if (path === "/admin/ocean-support") return handleAdminSupport(request, env, deps, url);
    if (path.startsWith("/admin/ocean-support/")) return handleAdminSupport(request, env, deps, url);
    if (path === "/admin/ocean-market" || path.startsWith("/admin/ocean-market/")) return handleAdminMarket(request, env, deps, url);
    if (path === "/admin/ocean-backups" && request.method === "GET") return handleBackupCenter(env);
  }

  return null;
}

export const oceanSuiteFeatures = FEATURE_DEFINITIONS.map(function (item) { return item.id; });
