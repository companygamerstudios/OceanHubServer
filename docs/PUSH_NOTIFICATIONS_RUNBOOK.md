# OceanHub — Push notifications

This branch adds the push-notification implementation without changing the production Worker or the main branch.

## Architecture

The existing notification inbox remains the source of truth. socialPushNotif() saves the notification to STATS first, then attempts remote delivery. A Firebase or device-delivery failure must not undo a saved DM or in-app notification.

- **Android:** Firebase Cloud Messaging HTTP v1 delivers to an FCM token registered by the Android Tauri app.
- **Web (Chrome/Edge and other supported browsers):** Firebase Web Messaging uses the root-scoped /firebase-messaging-sw.js service worker and the VAPID public key.
- **Windows Tauri EXE:** the installed app uses a same-origin authenticated WebSocket through the existing KV_LOCKER Durable Object and Tauri's native notification plugin. Closing the main window hides the app in the Windows notification area (system tray); the process remains active while it is in the tray.

The Windows design deliberately does **not** claim push delivery after the user exits OceanHub from the tray, kills its process, signs out of Windows or powers the PC off. Reliable delivery after process termination would require a separate Windows Push Notification Services (WNS) design with an eligible app identity/packaging and Microsoft Entra/Azure setup. The current NSIS installer branch is still separate.

## Security properties

- /api/push/* requires the existing OceanHub session; push endpoints do not create a second authentication system.
- Registration, unregistration and preference mutations are rate-limited in the Worker. The API rejects cross-origin requests when an Origin header is present.
- Device tokens are encrypted at rest with AES-GCM using a dedicated PUSH_TOKEN_ENCRYPTION_SECRET; the token itself is never used as the KV key.
- The account email is normalized and SHA-256 hashed for device/preference storage keys and push Durable Object names.
- Device-list mutations are serialized using the existing KV_LOCKER lock helper. At most 12 devices are stored per account.
- Push payload links are restricted to relative same-origin paths. The notification title/body are length-limited.
- FCM delivery is best-effort after the in-app notification has been persisted. Provider failures do not undo the message or notification record.
- Existing HMAC, key verification, sessions, payment handlers and existing secret values are not changed by this feature.

## Cloudflare production configuration (not performed by this branch)

In the oceanhud Worker, production environment:

### Variables (public Firebase Web configuration)

Add these as **Variables**, not secrets:

1. FIREBASE_WEB_CONFIG_JSON — one-line JSON containing the Firebase Web app configuration for project oceanhub-91e40:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId
2. FIREBASE_WEB_VAPID_KEY — the public VAPID key generated in Firebase Console → Project settings → Cloud Messaging → Web configuration.

The web configuration and public VAPID key are designed to be public client configuration. Never put a service-account private key in either variable.

### Secrets (private server-side credentials)

Add these as **Secrets** only:

1. FIREBASE_SERVICE_ACCOUNT_JSON — the complete JSON service-account private-key file generated from Firebase Console → Project settings → Service accounts → Firebase Admin SDK. It must belong to project oceanhub-91e40. Do not commit it, paste it in chat, or place it inside the Android/Web client.
2. PUSH_TOKEN_ENCRYPTION_SECRET — a separate random secret of at least 32 characters. It must not reuse the HMAC secrets, encryption secrets or any other provider key.

PowerShell example for generating a fresh 48-byte secret locally:

~~~powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
~~~

Copy the generated value directly into the Cloudflare Secret field, then store it in an approved password manager. Do not send it to chat, logs, issues or screenshots. wrangler.production_v18.jsonc lists both secret names under secrets.required so the production preflight will stop until they exist.

Do not use a Firebase service-account JSON file as a client-side config. Do not generate a key or alter Cloudflare production while reviewing this branch.

## Android CI configuration (not performed by this branch)

The Android APK workflow reads the local Firebase google-services.json only from the GitHub Actions secret:

FIREBASE_ANDROID_GOOGLE_SERVICES_JSON_BASE64

To create the secret locally in PowerShell, use the path where you saved the downloaded file:

~~~powershell
$path = "$env:USERPROFILE\Downloads\google-services.json"
[Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
~~~

In GitHub → companygamerstudios/OceanHubServer → Settings → Secrets and variables → Actions, create a repository secret with that name and paste the Base64 output. Do not paste the Base64 string into an issue, commit, workflow file or chat.

The CI step decodes it only into the generated Android build directory, checks the Firebase project ID and Android package (com.companygamerstudios.oceanhub), and configures the Google Services Gradle plugin. The file is not committed or uploaded as an artifact. If the secret is missing, the validation APK can still compile but FCM runtime setup is intentionally incomplete; the workflow emits a warning.

Keep using the existing Android release keystore and passwords for future signed releases. Do not replace or re-create the release keystore.

## User-facing behaviour

On /notifications, users can opt in on the current device and choose which categories to receive:

- Private messages (dm)
- Social activity (friend requests, invitations, etc.)
- Account/system notices

Defaults are enabled. Browser/Android permission prompts appear only after the user presses **Activar notificaciones**. Unregistering a device removes its token from the account's device list; it does not revoke the operating-system permission itself.

Windows additionally offers an optional “start OceanHub when Windows starts” setting. The setting is opt-in; when enabled, OceanHub starts hidden in the tray so its WebSocket can receive events.

## Platform limitations to test

- Android 13+ requires notification permission. Android can stop delivery after a user force-stops the app in system settings; the user must reopen the app. Battery-management policies may also delay delivery.
- Android FCM background notification messages are displayed by the OS. The current Tauri FCM plugin's Android service is token-focused and does not surface foreground message callbacks to the WebView; while OceanHub is open and in the foreground, the in-app inbox remains available, but a native toast for that foreground case needs a further native callback/handler.
- Browser Web Push requires HTTPS, a supported browser, an installed/available service worker and explicit notification permission. Browser/OS settings can suppress notifications.
- Windows uses close-to-tray, not a Windows service. The notification process must remain running. “Salir de OceanHub” exits the process and ends live push reception.

## Verification plan

1. Unit tests validate accepted platforms, rejected registrations, AES-GCM encryption/decryption, device registration/unregistration, category preferences, Origin rejection and service-worker output.
2. npm run check:syntax checks the Worker and both push modules.
3. npm test runs the full existing and push-specific test suite.
4. The Worker validation workflow performs a Wrangler dry run only; it does not deploy.
5. Android CI builds the debug ARM64 APK; release signing/publishing steps remain gated to main.
6. Windows CI runs a native Tauri compile check; it does not create or publish an EXE.
7. Manual integration testing with two OceanHub accounts is required after the secrets are configured: foreground/background Android, Chrome/Edge browser closed, Windows close-to-tray, user-disabled categories, sign-out and multi-device unregister.

No Firebase private key, Cloudflare secret, Android keystore or production token belongs in this repository.
