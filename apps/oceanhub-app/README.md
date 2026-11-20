# OceanHub para Android

OceanHub se distribuye en esta fase como **una aplicación Android instalable mediante APK**. No se generan instaladores de Windows ni clientes para otras plataformas.

## Qué instala el APK

- Nombre visible de la aplicación: **OceanHub**.
- Identificador Android: `com.companygamerstudios.oceanhub`.
- Icono de inicio: logo de OceanHub incluido en el paquete Android.
- Arquitectura de esta entrega: **ARM64 (arm64-v8a)**.
- Android mínimo: **Android 7.0 (API 24)**.
- Versión inicial del paquete: `3.0.0-preview.1` (versionCode `3000000`).

Al tocar el icono OceanHub, la aplicación abre la web completa oficial dentro de un WebView Android. No es un instalador de la página ni una maqueta con módulos falsos: las páginas, el inicio de sesión, los permisos y los datos siguen siendo los del Worker actual:

`https://oceanhud.yoelenmanuelzorrilla.workers.dev/`

La aplicación requiere Internet. No ofrece un modo offline ni crea un backend paralelo. La sesión queda guardada en el WebView de OceanHub y no se comparte automáticamente con Chrome u otro navegador.

## Instalar en un teléfono

1. Descarga el archivo `OceanHub-Android-arm64-preview.apk`.
2. Abre **Descargas** o el administrador de archivos y toca el APK.
3. Si Android lo solicita, permite la instalación desde esa aplicación (por ejemplo, Chrome o Archivos).
4. Pulsa **Instalar** y luego **Abrir**.
5. Busca **OceanHub** en el cajón de aplicaciones. El paquete aparece con el identificador `com.companygamerstudios.oceanhub`.

Si el teléfono no es ARM64, este APK no es el paquete correcto para ese dispositivo; en esta fase el workflow compila ARM64.

## Construir localmente

Requisitos: Node.js 22.12+, Rust estable, JDK 17, Android SDK/NDK y herramientas Tauri 2.

```sh
npm install
npm run tauri:android:init
npm run tauri:android:build
```

El script `tauri:android:build` genera APK. Para reproducir la compilación de pruebas CI:

```sh
npm run tauri:android:build -- --debug --target aarch64 --ci
```

## Entrega desde GitHub Actions

El workflow **OceanHub Android APK** compila el APK, valida con `aapt` el identificador, la etiqueta visible `OceanHub` y la actividad de inicio, y sube un único archivo `.apk` sin envolverlo en ZIP. Descarga el elemento llamado `OceanHub-Android-arm64-preview.apk` desde **Actions → OceanHub Android APK → Artifacts**.

Los artefactos de Actions caducan según el periodo de retención del workflow (actualmente 30 días). El enlace del artefacto de Actions no es una publicación permanente.


## APK firmada de Android (release)

El workflow **OceanHub Android APK** conserva el APK debug de prueba y, cuando se ejecuta en `main` por push o manualmente, también genera `OceanHub-Android-arm64-release.apk` con la clave privada protegida en GitHub Actions Secrets. Los secretos utilizados son `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` y `ANDROID_KEY_ALIAS`. El archivo del keystore y `keystore.properties` se crean solo en el runner y no se guardan en Git.

El paso de release verifica la firma con `apksigner` y comprueba el identificador y nombre del paquete antes de publicar el artefacto. No distribuyas el APK como actualización final hasta probar instalación limpia y actualización sobre una instalación anterior firmada con la misma clave, además de validar OAuth, sesiones, permisos, enlaces y pagos en dispositivos reales.

## Estado de seguridad y publicación

Los builds actuales son **debug APK de prueba**, firmados con la clave de depuración del entorno de compilación. Sirven para instalar y probar en dispositivos, pero no son una release comercial ni deben subirse a Google Play. La firma debug generada por CI no debe tratarse como una clave estable para actualizaciones: una versión siguiente puede requerir desinstalar la anterior antes de instalar el nuevo APK, lo que borra sus datos locales.

Para una release pública todavía hacen falta una clave Android release protegida en GitHub Secrets, firma verificable y estable, prueba de actualización sobre una versión anterior, política de privacidad/enlaces legales, pruebas completas en dispositivos y, para Google Play, la cuenta de Play Console y su proceso de publicación. No pongas claves privadas ni contraseñas en el repositorio o en el chat.

## Seguridad del WebView

- El contenido remoto conserva únicamente permisos del servidor; no obtiene permisos Tauri/IPC generales ni acceso libre al filesystem o al shell.
- Autenticación, 2FA, roles, sesión y autorización siguen en el Worker.
- OAuth Google/Discord, cargas de archivos, cámara, micrófono, enlaces externos y pagos requieren pruebas reales en WebView. Si un proveedor bloquea OAuth embebido, habrá que completar un retorno seguro al navegador/sistema antes de anunciar compatibilidad.
- Revisar rutas y responsive en teléfonos reales: welcome/login, perfil, Friends, notificaciones, Ocean Suite, Air Flow, Market y Creator.
