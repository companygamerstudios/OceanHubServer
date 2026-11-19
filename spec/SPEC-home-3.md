# Spec: OceanHub Home 3.0

## Objective
Convertir `/home` en el dashboard personal de OceanHub: actividad relevante, amigos, eventos, proyectos, notificaciones, recomendaciones y accesos rápidos. Debe conservar el propósito y los enlaces actuales, sin retirar las funciones de cuenta, tienda, DLC, suscripciones o administración que ya existen.

## Stack y estructura
- Backend: Worker `oceanhud` y KV/DO existentes.
- UI web: HTML/CSS/JS siguiendo el patrón actual de OceanHub Glass, con componentes accesibles y responsive.
- Datos: ampliar `/home-data` o añadir endpoints pequeños; no duplicar fuentes de verdad.
- Proyecto nativo futuro: reutiliza los contratos versionados de `everywhere`.

## Requisitos funcionales
1. Mostrar saludo, perfil, notificaciones no leídas, presencia de amigos y eventos próximos con datos reales.
2. Incluir accesos rápidos personalizables a módulos existentes.
3. Presentar proyectos de creadores y publicaciones destacadas mediante registros públicos aprobados.
4. Recomendaciones explicables basadas en señales disponibles; no inferir intereses sensibles ni revelar información privada.
5. Estados de carga, vacío y error que permitan seguir navegando si un proveedor auxiliar falla.
6. Mantener navegación a tienda, DLC, vendedores, Air Flow y paneles actuales según los permisos reales.

## Boundaries
- No exponer emails, IP, sesiones, órdenes privadas ni compras de otros usuarios.
- No calcular métricas a partir de placeholders ni inventar actividad.
- No cambiar autenticación ni permisos de los módulos enlazados.
- No eliminar ni renombrar `/`, `/home`, `/home-data` ni rutas heredadas.
- Evitar llamadas repetidas por cada tarjeta; limitar resultados y reutilizar datos ya calculados.

## Testing strategy
- Pruebas de autorización y forma del payload.
- Pruebas de vacío, proveedor ausente y datos incompletos.
- Pruebas de compatibilidad que comprueben los enlaces y rutas existentes.
- Prueba visual responsive y accesibilidad con teclado/lector de pantalla.

## Success criteria
- La página presenta información real y personalizada sin acceder a datos que el usuario no puede ver.
- Todas las acciones existentes siguen accesibles.
- Errores auxiliares no convierten todo Home en HTTP 500.
- `npm run check:syntax`, `npm test` y dry-run de Wrangler pasan.

## Out of scope
- Sustituir el sistema de login o los módulos de tienda/pagos.
- Recomendaciones basadas en perfiles publicitarios o datos sensibles.
- Feed paralelo; el Feed existente sigue como fuente.

## Open questions
- Los accesos rápidos pueden tener un valor inicial sensato; la persistencia de orden/preferencias debe decidirse al diseñar el contrato de usuario.
