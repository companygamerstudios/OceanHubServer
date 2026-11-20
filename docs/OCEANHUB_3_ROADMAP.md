# OceanHub 3.0 — Plan maestro

Este documento define la incorporación progresiva de las siete áreas solicitadas y el nuevo canal oficial de instalación. Es una hoja de ruta, no una afirmación de que todas las funciones estén ya implementadas.

## Reglas de compatibilidad

- Mantener las rutas, módulos, flujos de autenticación, pagos y herramientas existentes.
- No reemplazar el Worker oceanhud, no crear un segundo Worker y no exigir R2.
- Desarrollar en ramas y Pull Requests; validar sintaxis, pruebas, permisos y compatibilidad antes de integrar.
- No desactivar funciones antiguas mediante Feature Control. Los controles nuevos solo podrán afectar a sus propios módulos.
- No publicar a producción desde esta rama.

## Las siete áreas

1. **OceanHub Home 3.0** — Inicio personalizado con actividad, eventos, recomendaciones, notificaciones y accesos rápidos.
2. **Ocean Social Evolution** — Evolución de Feed, Friends, Crews y Messages: privacidad, solicitudes, moderación y actividad.
3. **Air Flow 3.0** — Workspace de IA con proyectos, conversaciones organizadas, archivos, tareas Agent y transparencia de proveedores; conservar modos y proveedores actuales.
4. **Ocean Market** — Evolución del catálogo aprobado hacia pedidos, historial, seguimiento y protección. Los pagos solo se habilitarán después de diseñar y probar estados, reembolsos, webhooks e idempotencia.
5. **Ocean Command 2.0** — Panel Staff con métricas basadas en datos reales, moderación, reportes, auditoría y estado operativo.
6. **Ocean Creator Ecosystem** — Perfiles y páginas de proyecto, publicaciones de cambios, descubrimiento e integraciones de Creator Studio.
7. **OceanHub Everywhere** — Interfaz responsive, accesibilidad, rendimiento, PWA y distribución de aplicaciones.


## Entorno de Preview (sin datos de producción)

La configuración `previews` crea el binding SQLite Durable Object `KV_LOCKER` en el ámbito aislado que Cloudflare provisiona para cada Preview. No declara `STATS` ni copia el ID de la KV de producción. Esto permite validar los endpoints públicos de instalación/versiones (`/download`, `/app.webmanifest`, `/sw.js`, `/ocean-icon.svg`, `/api/app/version`) sin conectar esa Preview a los datos de cuentas o compras.

Como consecuencia intencional, las páginas autenticadas que dependen de `STATS` no están habilitadas para esta primera Preview. Antes de probar funcionalidades privadas se debe aprovisionar una KV no productiva y configurar únicamente secretos de prueba; nunca se añadirá la KV productiva a `previews`. El binding Durable Object de cada Preview es independiente; no comparte sesiones ni bloqueos con producción.


### Validación de Preview de esta fase
- El comando configurado para la Preview de la rama es `npx wrangler preview --config wrangler.production_v18.jsonc`; el Worker no tiene un `wrangler.jsonc` predeterminado.
- La configuración declara solo `previews.durable_objects.bindings` para `KV_LOCKER`. No declara `previews.kv_namespaces`, por lo que la KV productiva `STATS` no se conecta a esta Preview.
- Cloudflare Build `8476d1a2-531d-477c-b464-9e0041e30e61` terminó con resultado `success` y creó la URL de rama `https://feat-oceanhub-3-download-center-oceanhud.yoelenmanuelzorrilla.workers.dev`.
- El build muestra advertencias de bindings de producción ausentes, especialmente `STATS`; es intencional para este alcance de prueba. Las páginas autenticadas que requieren KV no forman parte de esta Preview.
- El build exitoso no sustituye la verificación HTTP de cada ruta. La comprobación externa de `/download`, `/api/app/version` y `/app.webmanifest` permanece pendiente.

## OceanHub Everywhere y /download

- /download es el centro oficial de instalación.
- Primera entrega: se prioriza una aplicación nativa **solo para Android**, distribuida como APK. No se desarrollará ni publicará un cliente nativo para Windows en este alcance.
- /app.webmanifest define nombre, icono y modo de aplicación; /sw.js habilita el ciclo de vida PWA.
- /api/app/version publica una versión semántica, canal y versión mínima soportada, sin datos de usuario.
- El Worker añade un monitor a páginas HTML autenticadas. Cuando el servidor anuncia una versión posterior o una versión mínima mayor, presenta el aviso “Tu versión de OceanHub quedó obsoleta” con una acción de actualización.
- Las páginas privadas no se guardan en caché offline. El Service Worker utiliza red para navegación y muestra una pantalla sin conexión; evita dejar perfiles, mensajes o contenido privado almacenado en el dispositivo compartido.
- Para futuras versiones, incrementar APP_VERSION. Incrementar MINIMUM_SUPPORTED_VERSION solo cuando la versión anterior ya no sea compatible.
- Android: generar APK instalable, verificar nombre/icono/actividad de inicio y entregar el archivo .apk directamente (sin ZIP). Para distribución pública hará falta firma release estable y validar actualizaciones. Windows queda fuera de alcance.
- Los paquetes nativos deben publicarse como GitHub Releases y el centro /download solo debe enlazar assets de una release oficial verificada. No colocar binarios falsos ni placeholders descargables.

## Orden de trabajo

1. Cimiento de instalación PWA, versionado y aviso de actualización.
2. Inventario de rutas y componentes existentes; pruebas de no-regresión.
3. Home 3.0 y Social Evolution.
4. Air Flow 3.0.
5. Market y Creator Ecosystem.
6. Command Center 2.0.
7. QA final de seguridad, rendimiento, accesibilidad y Android.

## Estado de esta rama

- Incluido en esta primera fase: centro /download, web manifest, icono SVG, service worker de navegación en red, endpoint de versión, aviso global de versión obsoleta en páginas HTML autenticadas y pruebas unitarias del versionado/rutas.
- Pendiente para fases siguientes: completar las seis áreas funcionales y las mejoras de Home/Social/AI/Market/Command/Creator; firmar de forma estable el APK Android release; configurar publicación permanente; pruebas end-to-end en dispositivos reales.
- Esta rama no actualiza main, Cloudflare ni el Worker de producción.
