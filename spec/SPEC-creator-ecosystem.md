# Spec: Ocean Creator Ecosystem

## Objective
Ampliar Creator Studio con perfiles de creador, páginas públicas de juegos/proyectos, publicaciones de actualizaciones, descubrimiento y mejores integraciones, reutilizando la identidad y los proyectos existentes.

## Stack y estructura
- Backend: Worker actual, perfiles sociales y Creator Studio.
- Rutas existentes: `/creator-studio`, perfiles `/Profile/*` y Feed.
- Datos: proyecto público y updates con propietario comprobado; evitar duplicar identidad del creador.

## Requisitos funcionales
1. Perfil de creador con descripción, enlaces públicos permitidos y proyectos publicados.
2. Página pública por proyecto/juego con descripción, categoría, imágenes/recursos aprobados, propietario y fecha de actualización.
3. Posts de actualización/versiones ligados al proyecto y creados por sus propietarios autorizados.
4. Descubrimiento por categoría/actualización con filtros y paginación.
5. Integraciones hacia Events, Arena, Feed y Marketplace cuando el contenido exista y sea público.
6. Controles para denunciar y retirar contenido; mantener auditoría cuando Staff modera.

## Boundaries
- El backend verifica propiedad para editar o eliminar cada proyecto y update.
- Los enlaces externos se validan y se muestran de forma segura; no generar SSRF desde el servidor.
- No inventar juegos, descargas, rankings o ventas.
- No exponer datos privados del creador ni proyectos no publicados.
- Conservar Creator Studio y las rutas de perfiles existentes.

## Testing strategy
- Pruebas de propietario/no propietario, proyecto público/privado y updates.
- Validación de URL y XSS en texto/recursos.
- Pruebas de índices, paginación, búsqueda y borrado.
- Pruebas de accesibilidad y responsive.

## Success criteria
- Un creador puede mantener sus páginas y publicar actualizaciones.
- Usuarios pueden descubrir proyectos públicos sin acceder a borradores privados.
- Los links y acciones preservan autorización en backend.
- Creator Studio y perfiles existentes siguen operativos.

## Out of scope
- Hosting de juegos o distribución de ejecutables desde OceanHub sin pipeline de artefactos.
- Crear un nuevo sistema de cuentas o duplicar perfiles.
- Rankings pagados o reseñas no verificadas.

## Open questions
- Definir campos para media de proyecto y sus límites, usando almacenamiento ya disponible o enlaces externos; no introducir R2 por defecto.
