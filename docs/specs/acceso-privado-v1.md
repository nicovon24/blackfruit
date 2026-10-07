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
- El origen de la app se determina por solicitud y se valida contra hosts permitidos; no se configura `APP_URL`. Ver [ejecución y despliegue](ejecucion-despliegue-v1.md).
- La lista de dos correos autorizados y la revocación de sesiones se detallan en [acceso limitado a dos correos](acceso-dos-correos-v1.md).

## Aceptación

- [x] La cuenta admin se provisiona sin habilitar registro público.
- [ ] Sin sesión no se puede leer una venta ni invocar directamente una mutación privada.
- [ ] Una sesión sin permiso recibe rechazo en el servidor.
- [ ] Inicio y cierre de sesión funcionan tras recargar.
- [ ] Recuperación por correo y cambio de contraseña funcionan con el proveedor configurado; un enlace caducado o reutilizado se rechaza.
- [ ] El proceso de alta, recuperación y auditoría no imprime secretos en logs.

## Pendiente para uso real

La cuenta administrativa de desarrollo está provisionada y el login se comprobó contra el dashboard. El archivo local con la clave inicial se eliminó. El proveedor de correo sigue pendiente; la recuperación por email se implementará después de configurarlo y probar el envío real.
