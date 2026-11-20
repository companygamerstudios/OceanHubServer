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


## Existing implementation baseline (source review, main at 2026-11-19)

This section records the current Worker behavior before introducing new privacy preferences. It is a baseline, not a claim that all planned Social Evolution features already exist.

- **Profiles:** the public profile handler serves `/Profile/:username` and its existing profile aliases. Its `socialPublicUser` projection omits the account email and returns only public profile fields.
- **Friend graph:** `/api/friends`, `/friends/request`, `/friends/accept`, `/friends/reject` and `/friends/remove` operate on per-account outgoing, incoming and accepted lists.
- **Blocks:** `/block`, `/unblock` and `/blocks` use a per-account block list. The server checks the relationship in either direction before friend requests, DMs, typing and Feed interactions.
- **Direct messages:** `/messages/api` and `/messages/api/:username` read and write the pair's existing thread; the sender and recipient must be accepted friends and neither account may block the other. The inbox and message history remain scoped to the authenticated account/pair.
- **Typing:** `/messages/typing/:username` is authenticated, friend-only, block-aware and rate-limited. Presence/typing realtime state uses hashed account identifiers.
- **Presence:** `/friends/presence` GET returns the authenticated account's accepted friends only; POST refreshes the caller's heartbeat. The heartbeat uses a short TTL, while the selected status is stored separately. Invisible mode is intended to appear offline to other accounts.
- **Feed:** `/feed` requires authentication. Posts are visible to authenticated users except where the mutual block check excludes them. Authors can delete their own posts; other users can report them. Comments and posts have bounded lengths/counts and action rate limits.
- **Moderation:** `/admin/community-reports` is protected by the admin gate; user reports are stored separately from posts and are not exposed through the ordinary Feed UI.
- **Notifications:** `/api/notifications` uses the authenticated account's own notification key for read, read-all and clear operations.
- **Not present in this baseline:** there is no dedicated per-account privacy-preferences record/API, and there is no DM-request workflow. DMs currently require an accepted friendship.

### Privacy defects found during the baseline review

- In the no-realtime-snapshot fallback, the Friends presence handler passed the Worker environment as the email argument to the heartbeat-key function, so it did not read the correct friend's KV heartbeat.
- The presence response forced an invisible account's `online` flag to false, but still returned `status: "invisible"`, which disclosed the selected hidden status.
- Both findings are addressed in the separate draft PR #22 with a regression test. They are not considered fixed on the default branch until that PR is reviewed and merged.

## Privacy-preference contract proposal (not yet implemented)

Store a versioned, per-account preference record using a hash-derived account key. Read it on the server in every relevant route; the UI must not be the enforcement boundary. Do not migrate all legacy accounts by writing new records in bulk.

For accounts without a preference record, preserve their current behavior as the compatibility default:

| Setting | Compatibility default | Reason |
|---|---|---|
| Profile visibility | `public` | Existing public profile routes remain public |
| Activity / Feed visibility | `authenticated` | Existing Feed requires sign-in and filters blocked relationships |
| Friend requests | `registered_users` | Existing authenticated users can send requests, subject to mutual block |
| Presence visibility | `friends` | Existing presence endpoint enumerates accepted friends only |
| Direct messages | `friends_only` | Existing DM and typing handlers require accepted friendship |
| Message requests | `disabled` | No message-request feature currently exists; do not silently open DMs |

**Precedence:** a block in either direction always overrides a privacy preference. Hiding presence must not reveal an `invisible` enum, note, heartbeat or other side channel. A future message-request flow must not create a DM thread until the recipient accepts; rate limits, ownership checks and notification privacy must be enforced by the Worker.

Any later API/schema proposal must include explicit defaults, validation, migration, ownership, rate limiting and regression coverage before implementation.

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
