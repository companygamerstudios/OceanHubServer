# Spec: Ocean Social Evolution

## Objective
Evolucionar Feed, Friends, Crews y Messages existentes para ofrecer más control de privacidad, solicitudes de mensajes, moderación, publicaciones destacadas y actividad comunitaria sin crear una segunda red social ni romper los enlaces actuales.

## Stack y estructura
- Backend: Worker existente, KV y Durable Object existente.
- UI: páginas actuales `/feed`, `/friends`, `/crews`, `/messages` y APIs relacionadas.
- Nuevos contratos, si son necesarios: endpoints complementarios, versionados y probados.

## Requisitos funcionales
1. Preferencias de privacidad para presencia, solicitudes de amistad/mensajes y visibilidad de actividad.
2. Sistema de solicitudes de mensajes para personas que no son amigas, condicionado por configuración del receptor, límites y bloqueo mutuo.
3. Publicaciones fijadas por su autor dentro de su propio perfil/espacio, con límites explícitos y opción para desfijar.
4. Mejorar herramientas de denuncia, revisión Staff y trazabilidad de decisiones; conservar controles de bloqueo actuales.
5. Unificar la presentación de actividad y presencia, respetando el modo invisible y los estados existentes.
6. Mantener conversaciones, solicitudes, miembros y publicaciones ligados al propietario correcto.

## Boundaries
- Bloqueo mutuo prevalece sobre cualquier permiso de mensaje.
- Los usuarios no pueden editar roles, insignias o resultados de moderación desde el cliente.
- No mostrar conversaciones privadas, solicitudes privadas o presencia invisible a terceros.
- Toda mutación valida sesión, propiedad, límites de tamaño y frecuencia en el servidor.
- No borrar ni cambiar la semántica de rutas `/feed`, `/friends`, `/crews`, `/messages`, `/api/friends` ni los alias existentes.

## Testing strategy
- Matriz de privacidad por emisor/receptor y estado de amistad/bloqueo.
- Pruebas de propiedad, límites y rate limit para solicitudes y publicaciones fijadas.
- Pruebas de no-regresión para mensajes, typing indicator, presencia y notificaciones.
- Pruebas responsive y accesibilidad.

## Success criteria
- Los usuarios controlan quién puede contactarles y qué actividad se muestra.
- El backend impide eludir privacidad o bloqueo.
- La moderación conserva auditoría y no elimina el historial legítimo.
- La suite existente y las nuevas pruebas pasan.

## Out of scope
- Cifrado end-to-end nuevo o promesas de moderación automática perfecta.
- Reemplazar los sistemas existentes de Feed/Friends/Messages.
- Crear una app de chat separada.

## Open questions
- Definir valores por defecto de privacidad para cuentas antiguas; la migración debe preservar el comportamiento seguro actual y no ampliar exposición.
