# Runbook aplazado: backups cifrados de OceanHub (R2)

<aside>
**Estado: fuera del alcance actual.** Se acordó ejecutar cuatro fases de OceanHub sin contratar ni configurar almacenamiento R2. No crees el bucket ni añadas cargos para completar las pruebas de esta rama.
</aside>

Este documento se conserva como referencia técnica por si más adelante se aprueba y financia un mecanismo de backup remoto. No es un requisito de desarrollo, prueba o liberación para las cuatro fases activas.

## Estado actual

- No se ha creado un bucket R2 ni se ha validado un restore real.
- No se requiere un binding Worker `BACKUPS`.
- No se requiere configurar el Secret `BACKUP_ENCRYPTION_SECRET`.
- No invoques `/admin/backup` en esta entrega. Sin el binding, el handler falla cerrado y devuelve 503.
- La exportación autenticada de cuenta `GET /account/export` sigue funcionando sin R2, pero **no** es una copia de seguridad completa del sistema.

## Diseño técnico reservado para una fase futura

Si se aprueba posteriormente, el diseño previsto utiliza:

- Bucket R2 privado e independiente.
- Binding de Worker llamado `BACKUPS`.
- Secret `BACKUP_ENCRYPTION_SECRET` de al menos 32 caracteres aleatorios, distinto de `DYNAMIC_KEY_ENCRYPTION_SECRET` y `DYNAMIC_KEY_INDEX_SECRET`.
- Cuenta administradora con 2FA, cookie de sesión y `ADMIN_SECOND_PIN`.
- Pruebas en staging/Preview con KV sintética antes de usar datos reales.

### API que quedó preparada

Listar respaldos: `GET /admin/backup`

Crear respaldo: `POST /admin/backup` con acción `create`.

Restauración aditiva: `POST /admin/backup` con acción `restore`.

La restauración propuesta realiza primero una copia pre-restore y nunca elimina claves. Las claves efímeras de sesión, OAuth, OTP, nonces y limitación de frecuencia no se incluyen.

## Límites conocidos

- Máximo 450 claves y 6 MiB por snapshot. Si el namespace excede esos límites, la operación falla cerrada; no produce un respaldo parcial.
- No se ha ejecutado un restore real.
- Esto no sustituye una política externa de retención, versionado y restauración probada.
- Mantener el bucket privado y con acceso de mínimo privilegio si se retoma el proyecto.

**No habilitar en producción hasta que el mecanismo se financie, configure y valide con datos sintéticos en staging, y se guarde evidencia de la prueba.**
