# OceanHub 3.0 — Fase 0: inventario de compatibilidad

**Estado:** análisis estático inicial completado; pendiente de pruebas de comportamiento por ruta.  
**Propósito:** establecer una línea base para OceanHub App y NEXUS sin retirar ni modificar funciones existentes.  
**Alcance:** lectura del código de `main`; no se han ejecutado pruebas, cambiado el Worker ni validado rutas en producción.

## 1. Fuentes inspeccionadas

| Archivo | Observación |
|---|---|
| `OceanHub_SECURITY_PATCHED_FINAL_v18.js` | Worker principal; 11.377 líneas en la versión inspeccionada. Contiene `workerFetch` y el export del Worker. |
| `ocean-suite.js` | 924 líneas; módulo complementario de Ocean Suite. |
| `package.json` | Proyecto actual usa Node.js 22+ y Wrangler 4.146.0; scripts `dev`, `check:syntax`, `test` y `deploy:production`. No declara todavía Tauri, frontend de app ni scripts de empaquetado. |
| `docs/ocean-suite.md` | Documenta módulos Ocean Suite, enlaces, límites funcionales y alias de verificación. |
| `test/` | Contiene pruebas Node.js existentes; este inventario no afirma que todas las rutas tengan cobertura de integración. |

El código inspeccionado está en la rama `main` actual al momento de esta revisión. Debe repetirse el inventario si cambia el Worker antes de iniciar implementación.

## 2. Cómo se enrutan hoy las solicitudes

El punto de entrada del Worker llama a `workerFetch(request, env)`. El enrutador obtiene `url.pathname`, inicializa claves estáticas, trata `OPTIONS`, ejecuta la protección de rutas administrativas y luego aplica el gate general de autenticación antes de resolver las rutas.

Observaciones para el cliente independiente:

- `isPublicRoute(path)` contiene una lista concreta de páginas y excepciones públicas; también permite ciertos prefijos como `/auth/`, `/s/`, `/verify/` y perfiles públicos.
- Las rutas no públicas pasan por `requireAuth`; sin sesión válida, el flujo actual puede redirigir a `/welcome`. Una app API no debe interpretar una página HTML de redirección como una respuesta JSON satisfactoria.
- `adminProtectedPath(path)` aplica una comprobación administrativa anticipada a `/admin`, `/admin/*` y a varios endpoints operativos.
- `/ocean`, `/ocean/*` y `/admin/ocean-*` se ofrecen al módulo `handleOceanSuiteRoute`; el resto continúa en el enrutador principal.
- Las rutas y sus métodos deben evaluarse por separado: que un handler acepte POST no significa que el path completo sea exclusivamente POST, ni que una página HTML sea una API apta para una aplicación nativa.

**Implicación:** no configurar todavía el cliente Tauri para llamar indiscriminadamente a todas las rutas. Primero hay que documentar método HTTP, autenticación, rol, entrada, salida y tipo de contenido de cada operación que la app necesite.

## 3. Inventario funcional de rutas registradas

Esta clasificación se deriva de las condiciones de enrutamiento de los dos archivos principales. Es una línea base estática, no una prueba de que cada ruta esté disponible correctamente en producción.

### 3.1 Inicio, cuenta y perfiles

- Inicio y datos: `/`, `/home`, `/home-data`.
- Cuenta: `/welcome`, `/register`, `/login`, `/logout`, `/profile`, `/profile/edit`.
- Verificación de correo y recuperación: `/email/verify`, `/forgot-password`, `/reset-password`.
- Perfiles públicos y alias: `/Profile/*`, `/profile/*`, `/u/*`.
- Seguridad de cuenta: `/verify-2fa`, `/activar-2fa`, `/desactivar-2fa`, `/qr-2fa`, `/qr-totp`.
- OAuth: `/auth/google`, `/auth/google/callback`, `/auth/discord`, `/auth/discord/callback`.

### 3.2 Air Flow

- Aplicación y modos: `/air-flow`, `/air-flow/app.js`, `/air-flow/quick`, `/air-flow/think`, `/air-flow/study`, `/air-flow/gaming`, `/air-flow/travel`, `/air-flow/shopping`, `/air-flow/create`, `/air-flow/mode/*`.
- Conversación y capacidades: `/air-flow/chat`, `/air-flow/api/chat`, `/air-flow/vision`, `/air-flow/api/vision`, `/air-flow/file`, `/air-flow/api/file`, `/air-flow/memory`, `/air-flow/api/memory`, `/air-flow/conversations`, `/air-flow/api/conversations`, `/air-flow/feedback`, `/air-flow/api/feedback`, `/air-flow/agent`, `/air-flow/api/agent`.
- Imagen y Live: `/air-flow/create/image`, `/air-flow/api/create/image`, `/air-flow/create/image/status`, `/air-flow/live/token`, `/air-flow/api/live/token`.
- Herramientas y estado: `/air-flow/models`, `/air-flow/status`, `/air-flow/api/status`, `/air-flow/health`, `/air-flow/api/health`, `/air-flow/permissions`, `/air-flow/research`, `/air-flow/files/search`, `/air-flow/planner`, `/air-flow/code/review`, `/air-flow/security`, `/air-flow/artifact/*`.
- Administración: `/admin/air-flow`, `/admin/air-flow/personality`.
- Studio: `/air-flow-studio`.

La app deberá conservar todos los modos y capacidades existentes. Para cada modo se comprobarán operaciones, límites de archivo, MIME, proveedores disponibles y tipos de respuesta.

### 3.3 Comunidad y comunicación

- Feed y progreso: `/feed`, `/ocean-xp`.
- Amigos: `/friends`, `/api/friends`, `/friends/request`, `/friends/accept`, `/friends/reject`, `/friends/remove`, `/friends/presence`, `/friends/status`.
- Bloqueos: `/block`, `/unblock`, `/blocks`.
- Mensajes: `/messages`, `/messages/api`, `/messages/api/*`, `/messages/typing/*`, `/messages/*`.
- Notificaciones: `/notifications`, `/api/notifications`.
- Actividades: `/parties`, `/crews`, `/events`, `/arena`.
- Creación: `/creator-studio`.

### 3.4 Ocean Suite

- Usuario: `/ocean`, `/ocean/launcher`, `/ocean/developers`, `/ocean/air-flow`, `/ocean/reputation`, `/ocean/security`, `/ocean/security/revoke-others`, `/ocean/support`, `/ocean/support/*`, `/ocean/market`, `/ocean/verified`.
- Administración: `/admin/ocean-command`, `/admin/ocean-features`, `/admin/ocean-support`, `/admin/ocean-support/*`, `/admin/ocean-market`, `/admin/ocean-market/*`, `/admin/ocean-backups`, `/admin/ocean-verifications`, `/admin/ocean-verifications/*`.
- Rutas de acceso/compatibilidad: `/ocean/notifications`, `/ocean/social`, `/ocean/events`, `/ocean/status`.

### 3.5 Tienda, pagos y vendedores

- Catálogo y venta: `/shop`, `/sell`, `/pay`, `/dlc`, `/key`.
- Checkout y PayPal: `/shop/create-checkout`, `/paypal/capture`, `/paypal/webhook`, `/shop/success`, `/shop/cancel`.
- Suscripciones: `/suscribirse`, `/pay-subscription`, `/renovar-suscripcion`, `/cancelar-renovacion`.
- Vendedores: `/admin/sellers`, `/admin/resellers`, `/admin/resellers/summary`, `/admin/hacer-reseller`, `/admin/asignar-claves`, `/comprar-pack`, `/solicitar-retiro`.
- Opiniones: `/review`, `/reviews`.

**Límite de paridad:** Ocean Suite documenta que su catálogo moderado no procesa cobros todavía; no se debe confundirlo con los flujos de checkout existentes. No activar compras de Marketplace desde la app sin revisar separadamente los pagos y webhooks.

### 3.6 Operaciones, claves y administración

Se registran además rutas para verificación de claves, nonces, estadísticas, operaciones masivas, CSV/JSON, webhooks, logs, eventos SSE, consola, ingresos, usuarios, backup, carga de claves, migraciones, tareas programadas y administración de festividades. La implementación de app no debe exponer estas operaciones administrativas como controles de usuario general.

Ejemplos del enrutador actual: `/verify`, `/verify/*`, `/verify-web`, `/verify-batch`, `/key-info`, `/get-nonce`, `/generate`, `/generate-batch`, `/export-csv`, `/export-json`, `/webhook`, `/webhook/test`, `/webhook/register`, `/sse`, `/status`, `/stats/public`, `/admin`, `/admin/*`, `/admin-action`, `/admin/festividad`, `/admin/compras`, `/admin/users`, `/admin/user-action`, `/admin/backup`, `/admin/upload-keys`, `/admin/logs`, `/admin/console`, `/admin/ingresos`, `/admin/community-reports`, `/cron-renew`, `/cron-jobs`.

### 3.7 Páginas legales y utilidades

- `/privacidad`, `/aviso-legal`, `/terminos`, `/cookies`.
- `/shorten`, `/s/*`, `/invoice/*`, `/leaderboard`, `/canjear-puntos`, `/toggle-dark-mode`.
- Ruta de Google Site Verification presente en el enrutador.

## 4. Alias, redirecciones y rutas heredadas

Se deben mantener los destinos y la compatibilidad que ya existen:

- `/ocean/notifications` redirige a `/notifications`.
- `/ocean/social` redirige a `/feed`.
- `/ocean/events` redirige a `/events`.
- `/ocean/status` redirige a `/status`.
- Las rutas antiguas de verificación de usuario se documentan en `docs/ocean-suite.md`; allí se especifican las rutas oficiales actuales y las redirecciones históricas.
- Algunas rutas de perfiles, mensajes, tickets y artefactos son dinámicas, por lo que no se deben convertir en una lista de URLs estáticas cerrada.

No se deben borrar alias porque la app tenga su propia navegación. Los enlaces externos, marcadores, notificaciones por correo y clientes antiguos pueden seguir dependiendo de ellos.

## 5. Riesgos de integración de OceanHub App detectados

### 5.1 Autenticación en un origen diferente

El Worker actual fue construido principalmente para la web bajo el origen de producción y utiliza un gate de sesión/cookie. La app empaquetada tendrá un origen de webview distinto. No se ha demostrado todavía que el flujo de cookies, OAuth, 2FA, recuperación y redirecciones se comporte correctamente desde Tauri para Windows y Android.

**Acción requerida:** construir una prueba de concepto de autenticación antes de conectar funciones sensibles. Evaluar un flujo de sesión/token específico para app, con expiración, revocación, rotación, almacenamiento seguro nativo y protección CSRF apropiada. No guardar contraseñas o secretos en almacenamiento simple.

### 5.2 APIs mixtas HTML y JSON

Las rutas actuales incluyen páginas HTML, formularios y endpoints JSON. La app no debe depender del parseo de HTML ni usar rutas de interfaz como API.

**Acción requerida:** crear contratos complementarios y versionados, por ejemplo bajo `/api/v1/app/*`, solo cuando se demuestre que hacen falta. Mantener las rutas HTML y API actuales intactas.

### 5.3 CORS y métodos permitidos

El Worker atiende `OPTIONS`, pero el tratamiento actual no demuestra una política CORS específica que autorice el origen nativo ni justifica abrir CORS a cualquier origen.

**Acción requerida:** definir orígenes y encabezados mínimos por plataforma, revisar credenciales/cookies y validar solicitudes de origen. No añadir `Access-Control-Allow-Origin: *` junto con credenciales.

### 5.4 Permisos del cliente

El backend debe seguir siendo la autoridad para roles y permisos. El cliente puede ocultar opciones por experiencia, pero cada endpoint seguirá validando autenticación y rol en servidor.

### 5.5 Releases y actualizaciones

La distribución desde GitHub Releases sigue siendo una hipótesis de alojamiento, no una integración confirmada. Se debe validar tamaño de artefactos, disponibilidad, enlaces inmutables, versionado, firma, recuperación de claves y política de actualización antes de publicar.

## 6. Matriz necesaria antes de conectar cada función

Cada operación que OceanHub App vaya a consumir debe tener una fila con:

| Campo | Requisito |
|---|---|
| Identificador | Nombre estable del contrato de app. |
| Ruta existente | Endpoint actual si existe; nunca sustituirlo silenciosamente. |
| Método | GET/POST/etc. permitido y verificado. |
| Autenticación | Pública, usuario, Staff o servicio interno. |
| Entrada | Esquema validado y tamaños máximos. |
| Salida | JSON tipado, archivo, stream o HTML. |
| Errores | Códigos HTTP y mensajes normalizados. |
| Compatibilidad | Versión mínima de app y comportamiento de clientes antiguos. |
| Pruebas | Caso positivo, autorización, método inválido, entrada inválida y errores de proveedor. |
| Estado de app | Reutilizable, requiere adaptador o no listo. |

## 7. Criterios de cierre de Fase 0

La Fase 0 no se considerará terminada hasta que:

1. Se genere un inventario verificable de rutas exactas, patrones dinámicos, métodos y redirecciones.
2. Se localicen y clasifiquen las rutas realmente JSON frente a páginas HTML.
3. Se documente el rol requerido y la autenticación de cada endpoint candidato.
4. Se identifiquen operaciones esenciales para primera versión de la app y las que se reservarán para fases posteriores.
5. Exista una prueba de concepto de sesión para Tauri en Windows y Android, incluyendo 2FA, cierre de sesión y revocación.
6. Se definan pruebas automáticas de no-regresión para las rutas que se reutilicen.

## 8. Lo que no se ha hecho

- No se ha llamado a rutas reales de producción ni se ha probado su disponibilidad.
- No se han ejecutado `npm test`, `npm run check:syntax` ni builds.
- No se ha cambiado código de rutas ni autenticación.
- No se han creado endpoints `/api/v1/app/*`.
- No se han cambiado CORS, cookies, permisos, secretos, variables o recursos Cloudflare.
- No se ha creado ni publicado una app, APK, instalador o release.

**Regla de no-regresión:** toda ruta y función de la línea base se conserva hasta que exista evidencia, revisión y aprobación explícita de una migración compatible.
