# OceanHub para Android y Windows — versión 3.0.0

OceanHub se distribuye como una aplicación Android instalable mediante APK oficial firmada y prepara un cliente de escritorio Windows con Tauri.

## Iconos de la próxima versión

Los iconos fuente se mantienen separados por plataforma:

- Android: `assets/oceanhub-android.svg` (robot Android en el planeta OceanHub).
- Windows/PC: `assets/oceanhub-windows.svg` (símbolo de cuatro ventanas en el planeta OceanHub).

Los iconos se generan con la CLI Tauri, que crea los recursos PNG de launcher Android y el set de escritorio. No se deben sustituir manualmente los iconos generados dentro de `src-tauri/gen/android`: ese directorio es generado y se vuelve a crear en CI.

### Generar iconos localmente

Desde `apps/oceanhub-app`:

```sh
npm install
npm run tauri:android:init
npm run icons:android
```

Para un build de escritorio Windows, ejecuta `npm run icons:windows` antes de `npm run tauri:build`. Cada comando usa su arte de plataforma para generar el icono correspondiente.

## Datos de la aplicación Android

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
npm run icons:android
npm run tauri:android:build
```

El workflow **OceanHub Android APK** construye la APK ARM64, verifica la firma con `apksigner` y comprueba el identificador y nombre de paquete antes de crear la publicación estable de GitHub Releases.

El workflow de Windows valida el build y entrega el ejecutable de escritorio como artefacto directo. El instalador NSIS oficial se prepara en el workflow de distribución Windows separado; ninguno publica releases ni despliega a producción.

## Alcance de la distribución

La publicación Android permite descargar e instalar directamente la APK desde el sitio oficial. **No significa que la app esté publicada en Google Play**; esa distribución requiere Play Console, sus revisiones y los requisitos aplicables.

OAuth de terceros, pagos, cámara, micrófono, cargas de archivos y otros permisos deben seguir validándose cuando cambien proveedores, Android o WebView.
