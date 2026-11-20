# OceanHub para Android — versión estable 3.0.0

OceanHub se distribuye como una aplicación Android instalable mediante APK oficial firmada.

## Datos de la aplicación

- Nombre: **OceanHub**
- Versión estable: **3.0.0**
- Identificador Android: `com.companygamerstudios.oceanhub`
- Arquitectura: **ARM64 (arm64-v8a)**
- Android mínimo: **Android 7.0 (API 24)**
- versionCode: `3000001`

La aplicación abre el servicio oficial de OceanHub dentro de un WebView Android:

`https://oceanhud.yoelenmanuelzorrilla.workers.dev/`

Requiere conexión a Internet. El backend, las cuentas, sesiones y permisos siguen gestionados por el Worker oficial.

## Descargar e instalar

1. Abre el centro oficial: `https://oceanhud.yoelenmanuelzorrilla.workers.dev/download`.
2. Pulsa **Descargar APK Android**.
3. Abre el archivo descargado y confirma la instalación de OceanHub.
4. Si Android lo solicita, autoriza temporalmente la instalación desde el navegador o administrador de archivos que utilizaste.
5. Abre OceanHub desde el icono de aplicaciones.

Este paquete es ARM64. No lo instales en dispositivos Android con arquitectura distinta.

## Firma y futuras actualizaciones

La APK de producción se firma con el keystore de publicación protegido en GitHub Actions Secrets. Los secretos utilizados son `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` y `ANDROID_KEY_ALIAS`. El keystore y `keystore.properties` solo existen durante la ejecución del runner y no se guardan en el repositorio.

**Conserva una copia segura del archivo `OceanHub-release.jks` y de sus contraseñas.** Todas las actualizaciones futuras deben utilizar exactamente la misma clave de firma; nunca compartas ni publiques esos secretos.

## Compilar

Requisitos: Node.js 22.12+, Rust estable, JDK 17, Android SDK/NDK y Tauri 2.

```sh
npm install
npm run tauri:android:init
npm run tauri:android:build
```

El workflow **OceanHub Android APK** construye la APK ARM64, verifica la firma con `apksigner` y comprueba el identificador y nombre de paquete antes de crear la publicación estable de GitHub Releases.

## Alcance de la distribución

Esta publicación permite descargar e instalar directamente la APK desde el sitio oficial. **No significa que la app esté publicada en Google Play**; esa distribución requiere Play Console, sus revisiones y los requisitos aplicables.

OAuth de terceros, pagos, cámara, micrófono, cargas de archivos y otros permisos deben seguir validándose cuando cambien proveedores, Android o WebView.