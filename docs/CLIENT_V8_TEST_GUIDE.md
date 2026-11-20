# Guía de prueba de OceanHub V8 — HMAC

Esta guía comprueba la compatibilidad del cliente con el Worker actual sin revelar secretos ni cambiar la API de verificación.

## Contrato que debe usar el cliente

1. Solicita un Nonce nuevo con `GET /get-nonce`.
2. Toma el `nonce` de la respuesta JSON.
3. Usa un timestamp Unix en segundos.
4. Firma exactamente el texto `clave:timestamp:nonce` con HMAC-SHA256.
5. Envía `POST /verify` con JSON y `Content-Type: application/json`.

Ejemplo del cuerpo (no es una clave real):

    {
      "key": "CLAVE_DE_PRUEBA",
      "timestamp": "TIMESTAMP_UNIX",
      "nonce": "NONCE_RECIEN_SOLICITADO",
      "hmac": "FIRMA_HEX_EN_MINUSCULAS"
    }

El servidor compara la firma con `HMAC_SECRET_CURRENT` y, durante rotación, también puede aceptar `HMAC_SECRET_PREVIOUS`. El timestamp admite una ventana de ±120 segundos. El Nonce está ligado al hash de la IP que Cloudflare ve en la solicitud y se consume una sola vez.

## Prueba manual desde Node.js 22

Ejecuta esto en una terminal local. Define `OCEANHUB_TEST_KEY` con una clave de prueba ya creada en el Worker y `OCEANHUB_HMAC_SECRET` con el secreto actual del entorno de prueba. No escribas esos valores en el repositorio, capturas, registros o conversaciones.

    const base = 'https://TU-WORKER.workers.dev';
    const key = process.env.OCEANHUB_TEST_KEY;
    const secret = process.env.OCEANHUB_HMAC_SECRET;
    if (!key || !secret) throw new Error('Faltan variables de prueba');

    const nonceResponse = await fetch(`${base}/get-nonce`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!nonceResponse.ok) throw new Error(`Nonce HTTP ${nonceResponse.status}`);
    const { nonce } = await nonceResponse.json();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const { createHmac } = await import('node:crypto');
    const hmac = createHmac('sha256', secret)
      .update(`${key}:${timestamp}:${nonce}`, 'utf8')
      .digest('hex');
    const payload = { key, timestamp, nonce, hmac };

    const verify = async () => fetch(`${base}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const first = await verify();
    console.log('Primera verificación:', first.status, await first.json());
    const replay = await verify();
    console.log('Repetición esperada (400):', replay.status, await replay.json());

**Resultado esperado:** la primera solicitud devuelve HTTP 200 y `success: true`, `valid: true`; la segunda devuelve HTTP 400 con `Nonce inválido`.

## Prueba dentro del cliente Lua

- Usa el mismo `API_URL` del Worker de prueba.
- Solicita `GET /get-nonce` antes de cada verificación. No reutilices Nonces y no pongas claves, timestamp, firma o Nonce en la URL.
- Construye los bytes del mensaje sin espacios adicionales ni saltos de línea: `key .. ':' .. timestamp .. ':' .. nonce`.
- Envía HMAC-SHA256 en hexadecimal minúsculo. El cuerpo debe usar las propiedades `key`, `timestamp`, `nonce` y `hmac`.
- Haz las dos solicitudes desde el mismo dispositivo/red; Cloudflare debe observar la misma IP para emitir y consumir el Nonce.
- No registres el secreto, la clave completa ni la firma en consola.

## Límites de seguridad importantes

Un secreto HMAC incrustado en un script Lua distribuido a usuarios puede extraerse del cliente. La firma sirve como control de protocolo y fricción contra abuso, pero no debe considerarse una credencial imposible de copiar. No uses la misma cadena para HMAC, cifrado de datos o índices. La defensa real también depende de claves individuales, límites por IP/clave, revocación y monitoreo.

## Prueba automatizada

`test/verify-integration.test.mjs` simula `GET /get-nonce` y `POST /verify` con una clave sintética, HMAC real WebCrypto, el Durable Object y almacenamiento en memoria. Comprueba éxito, firma inválida, repetición del Nonce y vínculo a la IP. Esa prueba no sustituye una prueba contra un Worker Preview real con las variables del entorno de prueba.