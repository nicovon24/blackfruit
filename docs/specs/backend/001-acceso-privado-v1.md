# Especificación: acceso privado v1

**Origen:** plan de implementación y decisión de iniciar con una cuenta administrativa, sin registro público.

## Capacidad

La persona administradora provisionada inicia sesión, accede al CRM y recupera su contraseña por email. Todas las lecturas y mutaciones privadas se autorizan en el servidor. La solución permite añadir cuentas y permisos más adelante.

## Reglas

- No hay alta pública. Una cuenta se crea mediante una operación administrativa fuera de la interfaz pública.
- Las credenciales y sesiones se guardan en PostgreSQL; las contraseñas nunca se guardan en texto plano ni en Git.
- El rol inicial es `admin`. La comprobación de permisos ocurre en el servidor en cada lectura, Action y Route Handler; ocultar un botón no concede seguridad.
- La recuperación envía un enlace de un solo uso al email de la cuenta existente. La aplicación no debe revelar si un email está registrado.
- Secretos, URL de base y credenciales de correo se configuran por entorno. `production` y `dev/blackfruit` usan secretos y conexiones distintos.
- El origen de la app se determina por solicitud y se valida contra hosts permitidos; no se configura `APP_URL`. Ver [ejecución y despliegue](../db/001-ejecucion-despliegue-v1.md).
- Las cuentas permitidas se provisionan por separado. En producción, `ALLOWED_LOGIN_EMAILS` debe contener exactamente dos direcciones completas, distintas y válidas, separadas por coma. Si falta o es inválida, se deniega el acceso a todos. En desarrollo se puede omitir para pruebas; si está configurada, también se aplica.
- Se normalizan espacios y mayúsculas antes de comparar correos completos. No se autoriza por dominio o coincidencia parcial. La allowlist se comprueba al crear sesiones, en las rutas privadas y en cada mutación; quitar un correo revoca el acceso aunque conserve una cookie.
- Una dirección permitida no crea una cuenta. Las cuentas tienen contraseña propia y rol `admin` en esta versión. El error de inicio de sesión es genérico y no revela quién está autorizado.

## Aceptación

- [x] La cuenta admin se provisiona sin habilitar registro público.
- [ ] Sin sesión no se puede leer una venta ni invocar directamente una mutación privada.
- [ ] Una sesión sin permiso recibe rechazo en el servidor.
- [ ] Inicio y cierre de sesión funcionan tras recargar.
- [ ] Recuperación por correo y cambio de contraseña funcionan con el proveedor configurado; un enlace caducado o reutilizado se rechaza.
- [ ] El proceso de alta, recuperación y auditoría no imprime secretos en logs.
- [x] Una cuenta fuera de la lista no puede crear usuario ni sesión aunque tenga rol admin; una cookie se rechaza al retirar su correo. Las pruebas de desarrollo usan usuarios QA con la allowlist omitida.
- [ ] En producción, solo las dos direcciones exactas de la allowlist, si tienen una cuenta provisionada y contraseña válida, pueden crear una sesión; correo sin cuenta o contraseña incorrecta no crea sesión.
- [ ] Una allowlist ausente, mal formada o con direcciones repetidas mantiene producción cerrada; el mensaje de login es genérico.

El ensayo de dos cuentas permitidas en producción sigue pendiente de ejecución controlada. La política y sus criterios son parte de este spec de acceso; no constituyen una capacidad aparte.

## Pendiente para uso real

La cuenta administrativa de desarrollo está provisionada y el login se comprobó contra el dashboard. El archivo local con la clave inicial se eliminó. El proveedor de correo sigue pendiente; la recuperación por email se implementará después de configurarlo y probar el envío real.
