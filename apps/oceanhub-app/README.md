# OceanHub para Windows y Android

Las aplicaciones nativas de OceanHub son **contenedores Tauri 2 de la web completa**, no prototipos con módulos simulados ni una segunda implementación de la plataforma.

## Qué abre la aplicación

Windows y Android cargan el sitio oficial de OceanHub desde:

`https://oceanhud.yoelenmanuelzorrilla.workers.dev/`

El Worker actual sigue siendo el único backend y la única fuente de datos. La ruta raíz conserva el flujo web existente: si la persona no tiene sesión, el servidor la dirige a `/welcome`; después del acceso se muestran las páginas y funciones que correspondan a su cuenta y sus permisos.

Esto incluye las rutas reales que ya ofrece la web, como Home, perfiles, comunidad/Friends, notificaciones, Ocean Suite, Air Flow, Market, Creator, páginas legales y paneles autorizados. La aplicación no inventa pantallas ni datos para esos módulos.

## Diferencias por dispositivo

- **Windows:** ventana de escritorio redimensionable, con el sitio completo dentro de WebView2.
- **Android:** ventana móvil de pantalla completa, con las páginas web servidas al tamaño disponible y controles táctiles del WebView.
- Ambas plataformas usan las mismas rutas, reglas de autorización, cuenta y Worker. La sesión de la app queda en el almacenamiento de su propio WebView y no se comparte automáticamente con Edge, Chrome ni otros navegadores.

El diseño responsive depende del frontend real del Worker. Antes de publicar hay que comprobar rutas principales en anchuras pequeñas (320, 360, 390 y 430 px), tablet y escritorio; corregir desbordes, menús, formularios, tablas y navegación donde sea necesario. No se debe declarar la adaptación móvil terminada solo porque la APK compile.

## Arquitectura y seguridad

- La URL remota se fija en `src-tauri/tauri.conf.json` para los builds nativos y para `tauri dev`.
- No se replica el HTML de todas las páginas ni se crea un backend de app separado.
- El contenido web remoto no recibe permisos Tauri/IPC: el capability local mantiene solo los permisos mínimos. No se conceden permisos generales de filesystem, shell o comandos nativos al sitio.
- Inicio de sesión, 2FA, roles y autorización siguen siendo responsabilidad de la web y el Worker. No se guarda una contraseña o token en el frontend de la app.
- La aplicación requiere Internet para cargar las funciones alojadas en el Worker. La pantalla local es solo una ayuda de diagnóstico/fallback; no es una copia offline del sitio.
- Google/Discord OAuth, carga de archivos, cámara, micrófono, ventanas externas y pagos deben verificarse en los WebViews reales. Algunos proveedores bloquean OAuth dentro de WebViews embebidos; si ocurre, hay que abrir el acceso con el navegador del sistema y retornar mediante un callback/deep link validado antes de afirmar compatibilidad completa.

## Requisitos y desarrollo

- Node.js 22.12 o superior.
- Rust estable y herramientas de Tauri 2.
- Windows: WebView2.
- Android: Android Studio/SDK, NDK y JDK compatibles con Tauri.

El comando de desarrollo Tauri carga la web configurada en `devUrl`:

```sh
npm install
npm run tauri:dev
```

Build frontend y contenedor:

```sh
npm run build
npm run tauri:build
```

Android:

```sh
npm run tauri:android:init
npm run tauri:android:build
```

## Estado de publicación

Los builds previos solo demuestran que el contenedor puede compilar. No certifican autenticación, OAuth, pagos, cargas de archivos, comportamiento responsive, rendimiento ni accesibilidad de todos los módulos.

Los instaladores actuales de prueba son unsigned/debug. Para una release pública aún hacen falta pruebas de dispositivo, firma oficial por plataforma, identidad definitiva del paquete Android, estrategia de actualización firmada y validación del flujo OAuth. No publicar los builds de prueba como versiones finales.
