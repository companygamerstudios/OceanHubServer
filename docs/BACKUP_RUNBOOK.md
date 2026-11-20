# Runbook: backups cifrados de OceanHub

## Requisitos

- Cloudflare R2 bucket privado e independiente.
- Binding de Worker llamado BACKUPS.
- Secret de Worker BACKUP_ENCRYPTION_SECRET de al menos 32 caracteres aleatorios, distinto de DYNAMIC_KEY_ENCRYPTION_SECRET y DYNAMIC_KEY_INDEX_SECRET.
- Cuenta administradora con 2FA, cookie de sesión y ADMIN_SECOND_PIN.
- Ejecutar primero en staging/Preview con KV sintética.

## API preparada

### Listar respaldos
GET /admin/backup

### Crear respaldo
POST /admin/backup

JSON:
    {
      "action": "create",
      "confirm": "CREATE_OCEANHUB_BACKUP",
      "pin": "PIN_ADMINISTRATIVO"
    }

### Restauración aditiva
POST /admin/backup

JSON:
    {
      "action": "restore",
      "confirm": "RESTORE_OCEANHUB_ADD_ONLY",
      "key": "oceanhub/backups/...",
      "pin": "PIN_ADMINISTRATIVO"
    }

La restauración realiza primero una copia de seguridad pre-restore y nunca elimina claves. Las claves efímeras de sesión, OAuth, OTP, nonces y limitación de frecuencia no se incluyen.

## Límites conocidos de esta versión

- Máximo 450 claves y 6 MiB por snapshot. Si el namespace excede esos límites, la operación falla cerrada; no produce un respaldo parcial.
- No se ha ejecutado un restore real ni se ha creado el bucket/binding en Cloudflare.
- No es un reemplazo para una política externa de retención, versionado y restauración probada.
- Mantén el bucket privado y con acceso de mínimo privilegio.

**No habilitar en producción hasta que el restore se valide con datos sintéticos en staging y se guarde evidencia de la prueba.**