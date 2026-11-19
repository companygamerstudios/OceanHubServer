# OceanHub App — Tauri 2 shell

Este es el primer shell compilable de la aplicación independiente OceanHub. La interfaz se empaqueta dentro del cliente; no es un iframe ni una ventana que cargue el sitio web de producción.

## Estado de esta fase

- Shell Ocean Glass: incluido.
- Navegación visual del prototipo: incluida.
- Cliente conectado a los datos de usuarios: todavía no.
- Login, OAuth, 2FA y renovación/revocación de sesión nativa: pendientes de la prueba de compatibilidad de autenticación.
- Descargas EXE/MSI y APK firmadas: pendientes.
- Actualizaciones firmadas: pendientes de custodia de claves y del flujo de instalación por plataforma.

No introduzcas contraseñas, cookies, tokens ni claves privadas en este proyecto. No se ha configurado almacenamiento de credenciales ni permisos nativos adicionales. Los controles que aparecen como módulos en preparación no simulan operaciones reales.

## Requisitos

- Node.js 22.12 o superior.
- Rust estable y las herramientas de compilación de Tauri 2.
- En Windows, WebView2 y las dependencias indicadas por la guía oficial de Tauri.
- Para Android, Android Studio/SDK, NDK y JDK compatibles con Tauri.

## Desarrollo del frontend

```sh
npm install
npm run dev
```

## Abrir el shell nativo

```sh
npm run tauri:dev
```

## Comprobar el frontend

```sh
npm run build
```

## Builds nativos (fase posterior)

Windows:

```sh
npm run tauri:build
```

Android:

```sh
npm run tauri:android:init
npm run tauri:android:build
```

La fase inicial solo compila el frontend en CI. No se publican instaladores desde esta rama. Antes de crear una release hay que confirmar el identificador Android definitivo, custodiar la clave de firma fuera del repositorio y validar el flujo completo de instalación/actualización en dispositivos de prueba.
