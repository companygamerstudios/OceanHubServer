# Spec: OceanHub Everywhere

## Objective
Entregar OceanHub en web responsive, PWA y una aplicación independiente Ocean Glass para Windows y Android. El centro oficial es `https://oceanhud.yoelenmanuelzorrilla.workers.dev/download`. La app reutiliza el Worker actual como backend y no elimina ni sustituye el sitio.

## Stack y estructura
- Web/PWA: rutas del Worker actual, manifest, Service Worker y endpoint público de versión.
- App nativa: Tauri 2; el shell inicial bajo `apps/oceanhub-app/` usa TypeScript + Vite sin React.
- Backend: Worker `oceanhud`; APIs JSON versionadas y contratos específicos para app donde haga falta.
- Artefactos: GitHub Releases oficiales enlazadas desde `/download`; no R2 ni segundo Worker.

## Requisitos funcionales
1. `/download` muestra estado real de PWA, Windows y Android. Solo muestra botones de binarios después de que existan assets publicados y validados.
2. PWA instalable en Windows/Android, con diseño responsive y sin cachear páginas privadas, perfiles, mensajes, archivos privados o tokens.
3. Aplicación de escritorio independiente con instalador Windows `.EXE` y/o `.MSI`, UI propia, inicio de sesión y navegación mediante contratos de app.
4. Aplicación Android independiente distribuida como APK firmado. La identidad de paquete y certificado se conservan para actualizaciones compatibles.
5. Endpoint de versión con versión SemVer, canal, versión mínima, política opcional/obligatoria, notas y artefactos por plataforma. El shell inicial compara SemVer/prereleases y el mínimo admitido, y conserva la última política pública válida ante fallos temporales de red; la verificación de hash/firma y el instalador no están implementados todavía.
6. Actualizaciones de escritorio verifican firma antes de instalar. Android descarga un APK oficial, verifica su identidad/hash y abre el instalador del sistema; nunca intenta instalación silenciosa.
7. Si una versión es incompatible u obsoleta, muestra un aviso explicativo y solicita actualizar antes de usar las funciones incompatibles. Un fallo de red temporal no convierte una versión válida en obsoleta. El shell inicial solo informa del estado de versión; bloqueo de acceso e instalación se habilitarán cuando exista una ruta de actualización nativa firmada y probada.
8. Autenticación móvil debe probarse con 2FA, recuperación, cierre de sesión y revocación. Credenciales de sesión solo en almacenamiento seguro nativo; nunca passwords o tokens de auth en localStorage.
9. La app no consume páginas HTML como API; usa contratos JSON versionados bajo `/api/v1/app/*` y mantiene compatibilidad con web.
10. La web existente y todas las rutas actuales siguen siendo accesibles sin instalar la app.

## Boundaries
- Worker y datos existentes se conservan; no crear un Worker nuevo.
- No almacenar binarios falsos o enlaces ficticios ni presentar PWA como APK/EXE.
- No comprometer claves privadas de firma ni claves de Android; nunca subirlas a Git.
- No cambiar cookies o auth web sin una prueba y una migración compatible.
- Roles, sesiones y autorización se verifican siempre en backend.
- Android mantiene la confirmación requerida por el sistema; no prometer actualización silenciosa.
- Tauri Updater se limita a plataformas desktop compatibles; Android usa el flujo de instalación de paquetes del sistema.
- No activar despliegues de producción desde ramas ni durante estas fases de especificación.

## Testing strategy
- Unit tests de SemVer/prereleases, versión mínima, flags required/optional y fallos de red.
- Comprobar que el endpoint de versión permite CORS únicamente a los orígenes Tauri/Vite declarados, sin credenciales ni comodines.
- CI del shell: type-check + build de Vite, sintaxis del Worker, suite de regresión y Wrangler local dry-run sin despliegue.
- Tests de firma inválida, hash incorrecto, artefacto de otra plataforma y link no autorizado.
- Tests de autorización/API JSON, 2FA, logout, refresh/rotation y revocación.
- Builds en CI para Windows y Android; instalación limpia y actualización desde versiones anteriores en dispositivos/VM.
- PWA tests en Chrome/Edge desktop y Chrome Android; comprobar offline sin filtrar páginas privadas.
- Verificar que `npm run check:syntax`, `npm test` y dry-run Wrangler siguen pasando.

## Success criteria
- `/download` distingue claramente PWA y artefactos nativos.
- Un usuario puede instalar la app independiente en Windows y Android desde assets oficiales publicados.
- Actualizaciones desktop se verifican por firma; Android usa su flujo de instalación autorizado.
- Si falla el servicio de versiones, se conserva la última política válida y se ofrece reintento.
- La web y todas las rutas previas siguen funcionando.

## Out of scope
- Publicación en Microsoft Store/Google Play en la primera entrega.
- Instalar Android APK silenciosamente o eludir confirmaciones del SO.
- Hacer pagos o gestión de usuarios solo desde el cliente nativo.
- R2 o un segundo Worker.

## Open questions
- Identificador de paquete Android y nombre de producto firmado para Windows se fijarán antes del primer build release.
- Se necesita custodiar las claves privadas de firma en un almacén autorizado y configurar acceso de publicación mínimo antes de firmar artefactos.
- Política de soporte mínimo y canales (preview/stable) se definirá antes de publicar la primera app.
