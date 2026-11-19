# OceanHub 3.0 — Capability Map

**Estado:** mapa aprobado por el usuario; especificaciones funcionales preparadas para revisión.  
**Fuente:** solicitud OceanHub 3.0, referencias visuales aportadas y arquitectura NEXUS existente.  
**Regla principal:** evolución aditiva. El Worker actual `oceanhud`, el sitio web y todas sus rutas públicas/privadas continúan siendo compatibles.

## Módulos y dependencias

| ID estable | Responsabilidad | Depende de |
|---|---|---|
| `home-3` | Inicio personalizado y centro de actividad | `social-evolution`, `creator-ecosystem`; consume Events, Notifications y datos de cuenta existentes |
| `social-evolution` | Feed, Friends, Crews, Messages, privacidad y moderación | Identidad/sesiones existentes |
| `air-flow-3` | Workspace, proyectos IA, archivos y tareas Agent | Identidad/sesiones; motor Air Flow y proveedores existentes |
| `ocean-market` | Órdenes, pagos, seguimiento y reputación de transacciones | Identidad, roles Seller, PayPal/webhooks y Support |
| `command-2` | Métricas, moderación, auditoría y estado operativo | Contratos de todos los módulos y controles Staff existentes |
| `creator-ecosystem` | Perfiles públicos, páginas de proyecto, updates y descubrimiento | Creator Studio, perfiles y Feed existentes |
| `everywhere` | PWA, app independiente Windows/Android, distribución y updates | Contratos de API y autenticación móvil; módulo transversal |

## Orden acordado de ejecución

1. `everywhere` — completar el centro de instalación/versiones y validar la base de compatibilidad.
2. `social-evolution` y `creator-ecosystem` — extender verticalmente las funciones sociales y de proyectos.
3. `air-flow-3` — añadir workspace sin reemplazar motores, modos o proveedores.
4. `ocean-market` — pedidos y pagos solo tras pruebas de idempotencia, webhook y estados.
5. `command-2` — integrar métricas y operaciones verificables de todos los módulos.
6. `home-3` — consumir los datos ya construidos y presentar el inicio personalizado.
7. QA de paridad entre web, PWA, Windows y Android.

## Decisiones y límites globales

- Se conserva el Worker `oceanhud`; no se crea otro Worker.
- No se requiere R2. Los instaladores nativos se publicarán como assets de GitHub Releases y se enlazarán desde `/download` cuando existan y estén verificados.
- La aplicación nativa será independiente, con interfaz Ocean Glass empaquetada mediante Tauri 2; no será solo una ventana que abra el sitio web.
- Propuesta de cliente: TypeScript + React + Vite en `apps/oceanhub-app/`; confirmar versiones exactas y compatibilidad con Tauri al planificar el scaffold.
- Las rutas actuales siguen siendo compatibles. Se añadirán contratos JSON versionados bajo `/api/v1/app/*` solo cuando la app los necesite.
- El backend sigue siendo la autoridad para autenticación, propiedad de recursos, roles y permisos.
- No se habilitan cobros del Marketplace hasta verificar el ciclo completo de pedidos, webhooks, reintentos, reembolsos y conciliación.
- Los updates deben verificar firma. Tauri Updater se utiliza para escritorio; Android usa descarga del APK firmado y el instalador/confirmación del sistema, no instalación silenciosa.
- Un fallo temporal al consultar versiones no prueba que una app esté obsoleta y no debe bloquearla por sí solo.
- Ninguna fase implementa o despliega en producción sin pasar sus pruebas y revisión.

## Especificaciones

- [Home 3.0](SPEC-home-3.md)
- [Social Evolution](SPEC-social-evolution.md)
- [Air Flow 3.0](SPEC-air-flow-3.md)
- [Ocean Market](SPEC-ocean-market.md)
- [Command 2.0](SPEC-command-2.md)
- [Creator Ecosystem](SPEC-creator-ecosystem.md)
- [OceanHub Everywhere](SPEC-everywhere.md)
