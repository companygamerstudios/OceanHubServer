# Spec: Air Flow 3.0

## Objective
Ampliar Air Flow a un espacio de trabajo de IA con proyectos, conversaciones organizadas, biblioteca privada de archivos, tareas Agent, transparencia de proveedores y comparación de modelos, sin reducir ni reemplazar los modos, motores y proveedores actuales.

## Stack y estructura
- Motor actual: handlers y modos `/air-flow/*` del Worker.
- Complementos: Air Flow Studio y Workspace de Ocean Suite.
- UI web y app nativa: consumidores del mismo contrato funcional; los contratos móviles nuevos se versionan bajo `/api/v1/app/*`.

## Requisitos funcionales
1. Proyectos de IA que agrupen conversaciones y borradores, aislados por propietario.
2. Conversaciones organizadas por proyecto, búsqueda y etiquetas; conservar conversación nueva y el historial existente donde ya se almacena.
3. Biblioteca privada de archivos con límites de tamaño/MIME, retención y eliminación definidos.
4. Agent Tasks con estado, progreso, cancelación y confirmación humana antes de acciones externas, irreversibles o que modifiquen recursos del usuario.
5. Comparación de modelos que muestre claramente qué proveedor respondió y los errores parciales; no exponer claves ni enviar datos a proveedores no configurados.
6. Transparencia sobre el procesamiento por terceros y controles para no incluir datos sensibles en prompts.
7. Conservar Chat, Investigar, Visión, Archivos, Live, Crear imagen, Memoria, Agent y todos los modos/proveedores actuales.

## Boundaries
- No eliminar ni ocultar silenciosamente modelos/proveedores ya disponibles.
- No guardar secretos, prompts privados o archivos en registros públicos.
- Mantener propiedad por usuario y límites de subida existentes; revisar la retención y el borrado de archivos.
- Las tareas Agent no pueden cambiar pagos, roles, cuentas ni configuración administrativa sin permisos y confirmación explícitos.
- Ningún fallo de un proveedor debe filtrar respuestas de otro usuario.

## Testing strategy
- Pruebas de aislamiento entre cuentas y de límites MIME/tamaño.
- Pruebas por modo y proveedor configurado/no configurado.
- Pruebas de cancelación, reintentos, confirmación humana y tareas parcialmente fallidas.
- Pruebas de compatibilidad para las rutas y capacidades Air Flow existentes.

## Success criteria
- Los siete modos/capacidades citados siguen presentes y probados.
- Proyectos, conversaciones y archivos permanecen privados para cada cuenta.
- Una tarea con efectos externos muestra su plan y pide confirmación antes de ejecutarse.
- No se exponen valores de secretos ni se realizan operaciones administrativas desde un contexto normal.

## Out of scope
- Entrenar modelos propios o eliminar proveedores actuales.
- Activar nuevos proveedores de pago sin la correspondiente configuración segura y consentimiento.
- Delegar acciones externas de alto impacto sin confirmación.

## Open questions
- Límites máximos de proyectos y cuota de archivos; deben medirse contra el KV/bindings actuales antes de fijarse.
