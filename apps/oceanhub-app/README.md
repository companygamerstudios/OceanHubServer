# OceanHub — versión estable 3.0.0

OceanHub se distribuye como aplicación instalable para Windows y Android.

## Datos de la aplicación

- Nombre: **OceanHub**
- Versión estable: **3.0.0**
- Identificador: `com.companygamerstudios.oceanhub`
- Windows: **x64**, instalador **EXE (NSIS)**
- Android: **ARM64 (arm64-v8a)**, Android 7.0 (API 24) o superior
- Android versionCode: `3000001`

La aplicación abre el servicio oficial de OceanHub dentro de una ventana nativa:

`https://oceanhud.yoelenmanuelzorrilla.workers.dev/`

Requiere conexión a Internet. El backend, las cuentas y las sesiones siguen gestionados por el Worker oficial.

## Descargar e instalar

1. Abre el centro oficial: `https://oceanhud.yoelenmanuelzorrilla.workers.dev/download`.
2. En Windows, descarga **OceanHub-Setup-3.0.0-x64.exe**, ejecuta el instalador y sigue sus instrucciones.
3. En Android, pulsa **Descargar APK Android** y confirma la instalación.
4. Abre OceanHub desde el menú Inicio de Windows o desde el icono de aplicaciones Android.

El instalador Windows de esta entrega es x64. No es un paquete ARM64 de Windows.

## Firma y futuras actualizaciones Android

La APK de producción se firma con el keystore protegido en GitHub Actions Secrets. Los secretos son `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` y `ANDROID_KEY_ALIAS`. El keystore y `keystore.properties` solo existen durante la ejecución del runner y no se guardan en el repositorio.

**Conserva una copia segura de `OceanHub-release.jks` y de sus contraseñas.** Todas las actualizaciones Android deben utilizar exactamente la misma clave de firma. Nunca compartas ni publiques esos secretos.

## Compilar Windows

Requisitos: Windows 10/11 x64, Node.js 22.12+, Rust estable con MSVC y NSIS.

```sh
npm install
npm run tauri:windows:build
```

El workflow **OceanHub Windows EXE** compila el instalador NSIS en Windows, comprueba que el EXE existe y publica un artefacto directo. Al ejecutarlo manualmente desde `main`, puede adjuntar el EXE al Release estable `v3.0.0`.

## Compilar Android

Requisitos: Node.js 22.12+, Rust estable, JDK 17, Android SDK/NDK y Tauri 2.

```sh
npm install
npm run tauri:android:init
npm run tauri:android:build
```

El workflow **OceanHub Android APK** construye la APK ARM64, verifica su firma con `apksigner` y comprueba la identidad de la aplicación antes de publicar el Release estable.

## Alcance de la distribución

La distribución directa desde el sitio oficial no significa que la app esté publicada en Microsoft Store o Google Play. La publicación en esas tiendas requiere sus respectivos procesos y requisitos.

El instalador Windows de este workflow no incluye certificado de firma de código. Windows puede mostrar SmartScreen o “Editor desconocido”; eso no indica por sí solo que el archivo esté dañado. Para mostrar un editor verificado se necesita un certificado de firma de código válido y proteger su clave privada.

OAuth de terceros, pagos, cámara, micrófono, cargas de archivos y otros permisos deben seguir validándose cuando cambien proveedores, Windows, Android o WebView.
