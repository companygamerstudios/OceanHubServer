# OceanHub 3.0 — NEXUS
## Plan oficial y arquitectura propuesta

**Estado:** arquitectura y hoja de ruta aprobadas como dirección de producto.  
**Alcance de este documento:** planificación técnica; no implementa binarios, endpoints, pantallas, cambios de infraestructura ni despliegues.  
**Regla principal:** evolucionar OceanHub sin eliminar, renombrar ni cambiar silenciosamente ninguna función, ruta, permiso o flujo existente.

---

## 1. Visión

OceanHub 3.0 — NEXUS reúne ocho líneas de evolución en una plataforma gamer, social y de creación:

1. **OceanHub Home 3.0:** inicio personalizado, actividad, descubrimiento, eventos y accesos.
2. **Ocean Social Evolution:** Feed, Friends, Messages, Crews, Parties, privacidad y moderación.
3. **Air Flow 3.0:** espacio de trabajo de IA, proyectos, conversaciones, archivos y Agent.
4. **Ocean Market:** catálogo moderado, pedidos, pagos y protección comercial cuando los flujos estén verificados.
5. **Ocean Command 2.0:** operación de Staff, métricas, moderación, auditoría y soporte.
6. **Ocean Creator Ecosystem:** proyectos, perfiles, publicaciones y herramientas de desarrolladores.
7. **OceanHub Everywhere:** experiencia adaptable, accesibilidad, rendimiento y continuidad entre dispositivos.
8. **OceanHub App:** aplicaciones independientes para Windows y Android con interfaz Ocean Glass y centro de actualizaciones.

Las ocho líneas forman una hoja de ruta. No implican que todas las funciones estén terminadas ni que las rutas nuevas descritas como propuestas ya existan.

## 2. Decisiones confirmadas para OceanHub App

- **Experiencia:** aplicación independiente con interfaz Ocean Glass propia.
- **Plataformas iniciales:** Windows y Android.
- **Distribución:** instalador para Windows y APK descargable desde el sitio oficial.
- **Actualizaciones:** comprobación automática; actualizaciones obligatorias cuando una versión llegue al mínimo de compatibilidad o exista una incidencia crítica.
- **Descargas:** página oficial prevista en `/download`, bajo el Worker actual.
- **Backend:** se conserva el Worker `oceanhud`; no se crea un segundo Worker.
- **Almacenamiento:** no se introduce dependencia de R2. Se evaluará GitHub Releases como alojamiento inicial de binarios y se comprobarán límites, disponibilidad y necesidades de distribución antes de publicar.

La ruta `/download` es una ruta planificada; no debe anunciarse como operativa hasta que se implemente, publique y pruebe.

## 3. Arquitectura propuesta

### 3.1 Componentes

| Capa | Responsabilidad |
|---|---|
| Worker actual `oceanhud` | Backend, identidad, sesiones, permisos, pagos, datos y rutas web existentes. |
| API de compatibilidad de app | Contratos JSON versionados para las funciones que la app no pueda consumir de forma segura mediante endpoints existentes. |
| Cliente OceanHub App | Interfaz propia empaquetada, navegación, estado local mínimo y adaptadores de plataforma. |
| Shell Tauri 2 | Ventana de Windows, integración móvil Android y acceso controlado a capacidades nativas. |
| Centro de descargas `/download` | Página pública de versiones, requisitos, notas y enlaces oficiales de descarga. |
| Servicio de versiones | Manifiesto de publicación, mínimo admitido, obligatoriedad, notas, hashes y artefactos por plataforma. |
| GitHub Releases (propuesto) | Distribución inicial de instaladores/APK versionados, si la validación de límites y disponibilidad resulta adecuada. |

### 3.2 Estructura de proyecto prevista

La app se añadirá como proyecto aislado dentro del mismo repositorio. La propuesta inicial de carpetas es:

```text
apps/
  oceanhub-app/
    src/                  # interfaz Ocean Glass compartida
    src-tauri/            # shell Tauri y comandos nativos
    src-tauri/capabilities/
    src-tauri/icons/
    tests/
    README.md
docs/
  oceanhub-3-nexus.md
```

Esta estructura es una propuesta. Antes de crearla, se confirmará la estrategia de package manager, build, dependencias y CI para no alterar los comandos actuales del Worker.

La interfaz se compila y empaqueta con la aplicación. No será una ventana que simplemente abra la web de producción ni un iframe de `oceanhud.yoelenmanuelzorrilla.workers.dev`. La app tendrá navegación, componentes y estilos propios; los datos y operaciones autorizadas se conectarán al backend mediante contratos API.

### 3.3 Relación entre app y web

- La web seguirá funcionando como producto completo e independiente.
- La app consumirá el mismo backend y respetará los mismos permisos de cuenta y Staff.
- Las rutas web actuales seguirán respondiendo como hasta ahora.
- No se reemplazará `/home`, `/air-flow`, `/ocean`, `/profile` ni otra ruta por una vista exclusiva de la app.
- Se inventariarán las rutas y endpoints actuales antes de diseñar contratos nuevos.
- Si falta una API JSON para alguna función, se añadirá una ruta API versionada y complementaria; no se cambiará el contrato de la ruta HTML existente.
- Las funciones que aún no tengan API móvil segura se identificarán como brechas de paridad, no se simularán ni se declararán completadas.

### 3.4 Identidad, sesiones y permisos

La app reutilizará el sistema de cuentas de OceanHub. El diseño de integración deberá:

- Mantener las reglas actuales de autenticación, verificación de email, 2FA y autorización del backend.
- No guardar contraseñas, PIN, semillas TOTP ni claves API en preferencias de la app.
- Guardar únicamente credenciales de sesión necesarias en almacenamiento seguro de la plataforma, sujeto a una revisión del flujo actual de cookies/sesiones.
- Revalidar roles y permisos en el Worker; ocultar un botón en el cliente nunca será un control de acceso.
- Permitir cierre de sesión y revocación desde el Centro de seguridad existente.
- Usar HTTPS, validar destinos de deep links y limitar las capacidades nativas por permiso mínimo.

## 4. OceanHub Update Center

### 4.1 Manifiesto de versiones

El servicio de versiones expondrá un manifiesto estructurado por plataforma y canal. Campos propuestos:

| Campo | Uso |
|---|---|
| `version` | Versión publicada (SemVer). |
| `minimumSupportedVersion` | Versión mínima que todavía puede usar el servicio. |
| `required` | Indica si la actualización es obligatoria. |
| `requiredAfter` | Fecha/hora límite para una actualización obligatoria, si aplica. |
| `channel` | Canal estable o de pruebas internas. |
| `publishedAt` | Fecha de publicación. |
| `releaseNotes` | Cambios visibles para usuarios. |
| `platforms` | Artefacto, arquitectura, URL, tamaño y SHA-256 por plataforma. |
| `signature` | Material de firma requerido por el mecanismo seguro de actualización. |

El manifiesto debe validarse en el servidor y en el cliente. Los enlaces de descarga deben pertenecer a los dominios oficiales autorizados. Un hash detecta corrupción; la firma verifica autenticidad y no se sustituye por el hash.

### 4.2 Flujo de actualización

1. La app comprueba la versión al iniciar sesión y periódicamente con intervalo limitado.
2. El cliente compara la versión local con `version` y `minimumSupportedVersion`.
3. Si es opcional, informa y permite posponer.
4. Si es obligatoria, muestra pantalla de actualización requerida y bloquea las funciones incompatibles hasta completar la actualización.
5. Si es crítica, la pantalla explica el motivo, la versión mínima y ofrece descargar, reintentar o salir.
6. El cliente descarga únicamente el artefacto correspondiente a su plataforma.
7. Verifica firma y/o identidad del paquete antes de solicitar la instalación.
8. Tras instalar y reiniciar, confirma la nueva versión y restaura la navegación permitida.

La app nunca debe considerar un error de red aislado como prueba de que una versión quedó obsoleta. Debe conservar la última política válida y ofrecer reintento; no debe bloquear indefinidamente a alguien por una caída del endpoint de versiones.

### 4.3 Windows

- Distribución inicial prevista: instalador firmado para Windows (por ejemplo, paquete NSIS `.exe` generado por Tauri).
- Actualizador de escritorio de Tauri con artefactos firmados y clave pública integrada en la app.
- La clave privada de actualización estará protegida fuera del repositorio y disponible únicamente al proceso de publicación autorizado.
- El instalador y el actualizador se probarán con instalaciones limpias y actualizaciones desde versiones anteriores.
- Una actualización obligatoria puede iniciar el instalador y reiniciar la app cuando el usuario tenga oportunidad de guardar su trabajo.
- La publicación no debe depender de ejecutar manualmente comandos desde el ordenador del usuario.

### 4.4 Android

- Distribución inicial prevista: APK desde `/download`.
- Se mantendrán constantes el identificador de paquete y la identidad de firma durante la vida de la aplicación.
- Cada publicación incrementará el código de versión de Android.
- La app descargará el APK firmado y abrirá el instalador del sistema para completar el proceso.
- Android puede requerir que el usuario autorice la instalación desde esa fuente y confirme la actualización. OceanHub no intentará omitir esas decisiones del sistema operativo.
- Cuando la actualización sea obligatoria, OceanHub podrá bloquear las funciones incompatibles y guiar al usuario al instalador; no puede garantizar una instalación completamente silenciosa.
- La pérdida de la clave de firma puede impedir que los usuarios actualicen la instalación existente; la clave y sus copias de recuperación requieren custodia estricta.

### 4.5 Política de obligatoriedad

- **Normal:** aviso y posponer.
- **Mínimo de compatibilidad:** bloqueo de las funciones que requieren una versión nueva después de la fecha límite publicada.
- **Crítica de seguridad:** pantalla obligatoria, explicación clara y acceso al flujo de actualización.
- **Servicio de versiones no disponible:** no forzar una actualización basándose solamente en la falta de conexión; conservar la última política válida y reintentar.

Se preservarán salida, reintento y acceso a información necesaria para resolver la actualización. El bloqueo obligatorio no debe causar pérdida de datos locales ni eliminar opciones de soporte.

## 5. Página oficial de descargas

Ruta propuesta: `/download` en el Worker existente.

Contenido mínimo:
- Marca OceanHub y explicación breve.
- Botones de Windows y Android solo cuando existan artefactos publicados y validados.
- Versión estable actual, fecha, notas de versión y tamaño de archivo.
- Requisitos mínimos y arquitectura admitida.
- SHA-256 y datos de firma verificables.
- Aviso de que Android abre el instalador oficial del sistema.
- Historial de versiones y guía de solución de problemas.
- Estado de disponibilidad del servicio de actualizaciones.

No se publicarán enlaces ficticios ni botones que apunten a artefactos inexistentes. Hasta tener una versión firmada y probada, la página debe mostrar claramente que las descargas aún no están disponibles.

## 6. Las ocho líneas de trabajo y sus entregables

### 01 — Home 3.0
- Evolución del inicio, descubrimiento, actividad y accesos personalizados.
- Reutilizar perfiles, eventos, notificaciones y módulos existentes.
- No duplicar el inbox ni crear una segunda fuente de notificaciones.

### 02 — Social Evolution
- Mejoras progresivas de Feed, Friends, Messages, Crews y Parties.
- Controles de privacidad, moderación, solicitudes y experiencia de chat.
- Mantener presencia y señales de escritura ya integradas; probarlas en móvil.

### 03 — Air Flow 3.0
- Espacio de trabajo con conversaciones, proyectos y biblioteca organizada.
- Mantener Chat, Investigar, Visión, Archivos, Live, Crear imagen, Memoria y Agent.
- No retirar proveedores, modelos, endpoints ni controles actuales sin revisión de compatibilidad y privacidad.

### 04 — Ocean Market
- Evolucionar el catálogo existente con pedidos, estados, protección y valoraciones verificadas.
- No habilitar compras ni comisiones nuevas hasta verificar pagos, webhooks, reembolsos e idempotencia en pruebas controladas.
- No inventar ventas, reseñas o reputación.

### 05 — Command 2.0
- Mejorar Command Center, Feature Control, auditoría, moderación y Support Center.
- Métricas basadas en datos reales y permisos del lado del servidor.
- Feature flags de NEXUS no deben apagar módulos preexistentes.

### 06 — Creator Ecosystem
- Evolucionar Creator Studio, proyectos, perfiles, publicaciones y Developer Hub.
- Mantener la propiedad y visibilidad de proyectos según las reglas actuales.

### 07 — Everywhere
- Diseño adaptable, accesibilidad, rendimiento y continuidad entre escritorio y móvil.
- La web seguirá siendo compatible con navegadores; la app será una opción adicional.

### 08 — OceanHub App
- Proyecto Tauri 2 para Windows y Android.
- Cliente independiente con interfaz Ocean Glass empaquetada.
- Cliente API versionado, permisos mínimos, notificaciones permitidas y actualización segura.
- Portal `/download` y canales de distribución por plataforma.

## 7. Compatibilidad: lista de no-regresión

Antes de cualquier refactor o lanzamiento se creará un inventario automatizado de rutas y contratos actuales. Como mínimo, la matriz de compatibilidad cubrirá:

- Autenticación, registro, verificación de email, OAuth, 2FA, recuperación y sesiones.
- Inicio, perfiles, edición de perfiles, amistades, feed, mensajes y notificaciones.
- Parties, Crews, Events, XP, Arena y Creator Studio.
- Air Flow y todos sus modos, proveedores y funciones existentes.
- Ocean Suite, Security Center, Support Center, Seller Reputation, Marketplace y OceanHub Verified.
- Paneles de Staff, roles, controles de acceso, auditoría y rutas administrativas.
- Checkout, suscripciones, webhooks, historial y controles comerciales.

Cada ruta existente tendrá una decisión explícita: conservar, ampliar de forma compatible o redirigir únicamente si ya existe una migración aprobada. No se borrará ni cambiará una ruta por conveniencia de la app. Las redirecciones antiguas existentes también se conservarán y probarán.

La documentación actual de rutas y módulos continúa en `docs/ocean-suite.md` y `README.md`; este documento la complementa y no la reemplaza.

## 8. Seguridad y publicación

- No guardar secretos, claves privadas de firma ni certificados en Git.
- Proteger las claves de actualización y de firma Android con accesos mínimos y copias de recuperación controladas.
- Generar artefactos reproducibles cuando sea viable; calcular hashes y firmar cada publicación.
- Publicar releases inmutables y manifiestos verificables.
- Construir Windows y Android en trabajos CI separados; no ejecutar un despliegue a Cloudflare para publicar los binarios.
- Requerir revisión humana de la versión, notas, obligatoriedad y artefactos antes de una publicación estable.
- Validar descargas, firmas, interrupciones, reintentos, rollback, compatibilidad y restauración de sesión.
- No desplegar cambios en producción ni cambiar variables, secretos, KV, Durable Objects o ajustes del Worker como parte de una publicación de app sin un PR y una revisión independientes.

## 9. Fases de implementación

| Fase | Entrega | Criterio de salida |
|---|---|---|
| 0 | Inventario de rutas, APIs, permisos y flujos | Pruebas de referencia y mapa de compatibilidad aprobado. |
| 1 | Esqueleto de app Tauri 2 y Ocean Glass | Builds locales Windows/Android y navegación independiente. |
| 2 | Cliente API y autenticación | Sesiones seguras, permisos backend y paridad de funciones priorizadas. |
| 3 | Portal `/download` y manifiesto de versiones | Página y API probadas; sin enlaces a artefactos inexistentes. |
| 4 | Pipeline de releases firmados | Instalación limpia y actualización validada en ambos sistemas. |
| 5 | Paridad funcional y pruebas de regresión | Matriz de rutas y funciones sin regresiones conocidas. |
| 6 | Lanzamiento gradual | Canal interno, grupo piloto, estabilidad y publicación general. |
| 7 | NEXUS completo | Ocho líneas de trabajo verificadas y documentación actualizada. |

## 10. Fuera del alcance de este plan documental

Este cambio de planificación no:
- crea todavía el proyecto Tauri ni los instaladores;
- implementa `/download` ni endpoints de actualización;
- cambia el Worker, configuraciones Wrangler, secretos, KV o Durable Objects;
- sube archivos binarios ni crea un GitHub Release;
- despliega o modifica producción;
- borra, renombra ni modifica rutas existentes.

Cada etapa de implementación tendrá su propia rama y PR, pruebas automatizadas y revisión. Las modificaciones del Worker que puedan activar el workflow de producción solo llegarán a `main` después de aprobar la compatibilidad, las pruebas y el procedimiento de publicación.

---

## Referencias técnicas

- [Tauri 2 — arquitectura y aplicaciones multiplataforma](https://tauri.app/).
- [Tauri Updater — firma de artefactos, manifiestos y comprobación de actualizaciones](https://tauri.app/plugin/updater/).
- [Android Developers — firma de aplicaciones y actualizaciones](https://developer.android.com/studio/publish/app-signing).
- [Cloudflare Workers — Static Assets](https://developers.cloudflare.com/workers/static-assets/).

Estas referencias fundamentan la dirección técnica; las versiones exactas de dependencias y los detalles de instalación se fijarán durante la fase de prueba de concepto.
