# Spec: Ocean Command 2.0

## Objective
Convertir el Command Center actual en un panel Staff operativo con métricas reales, moderación, reportes, gestión de usuarios y vendedores, soporte, auditoría y salud de servicios.

## Stack y estructura
- Backend: Worker actual y Ocean Suite.
- Entrada: rutas `/admin/ocean-*` y paneles administrativos heredados.
- UI: Ocean Glass responsive, sin crear un panel separado que duplique los controles existentes.

## Requisitos funcionales
1. Dashboard de cuentas, actividad, órdenes, publicaciones, tickets, eventos de moderación y estado de servicios con fecha de actualización y fuente.
2. Colas de moderación unificadas con filtros, detalle, decisión, motivo y registro de quién ejecutó cada acción.
3. Gestión de reportes comunitarios, publicaciones del Marketplace, verificación, vendedores y Support Desk.
4. Auditoría paginada y filtrable, protegida contra edición por usuarios normales.
5. Indicadores de proveedores/configuración solo como presencia/estado; nunca mostrar valores secretos.
6. Permisos por rol comprobados en el servidor para cada endpoint mutante.
7. Panel usable en pantallas pequeñas sin esconder acciones críticas ni eliminar las páginas administrativas actuales.

## Boundaries
- Admin y 2FA requerido según la política vigente para operaciones administrativas.
- No presentar datos simulados como métricas reales.
- No aceptar autoridad basada en botones ocultos o nombres de usuario; validar rol del lado del servidor.
- No exponer IP, cookies, tokens, secretos ni material sensible en el dashboard.
- No permitir que errores de observabilidad se interpreten como "servicio sano".

## Testing strategy
- Pruebas de autorización admin/no admin y 2FA para mutaciones.
- Pruebas de datos agregados con límites/paginación y ausencia de datos.
- Pruebas de auditoría inmutable desde UI normal y registro de actor.
- Pruebas responsive y teclado.

## Success criteria
- Todos los indicadores indican fuente y frescura; métricas desconocidas aparecen como no disponibles.
- Toda acción administrativa importante tiene autorización y auditoría.
- Los controles actuales siguen alcanzables mediante rutas existentes.
- No aparece contenido secreto en respuestas HTML/JSON.

## Out of scope
- Gestión de secretos desde el panel web.
- Cambiar permisos de Cloudflare, rotar credenciales o modificar recursos de producción automáticamente.
- Sustituir Cloudflare Observability.

## Open questions
- Definir umbrales y retención de métricas tras medir el volumen actual; no inventar cifras de negocio.
