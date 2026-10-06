# Acceso limitado a dos correos v1

## Actor y resultado

El administrador y su hermano pueden iniciar sesión con cuentas provisionadas. Ninguna otra cuenta puede iniciar sesión ni usar una sesión previa para consultar o modificar datos privados.

## Reglas y datos

- Los dos correos se configuran por entorno en `ALLOWED_LOGIN_EMAILS`, separados por coma. No se escriben en código ni documentación pública.
- En producción la lista debe contener exactamente dos direcciones distintas y válidas. Si falta o es inválida, el acceso privado se cierra para todos.
- En desarrollo, la variable puede omitirse para ejecutar pruebas con usuarios QA temporales. Si se configura, se aplica la misma restricción.
- Se comparan direcciones completas tras quitar espacios y normalizar mayúsculas. Coincidir solo por dominio o por parte del correo no autoriza.
- El registro público sigue deshabilitado. Estar en la lista no crea una cuenta: cada persona necesita una cuenta provisionada con contraseña propia. Ambas cuentas tienen rol `admin` en esta versión.
- La restricción se comprueba antes de crear usuarios y sesiones, en los endpoints de autenticación que usan una sesión y en cada lectura o mutación privada de la app. Un correo retirado pierde acceso aunque conserve una cookie anterior.
- Los errores de login mantienen un mensaje genérico para no revelar qué correos están permitidos.

## Estados, permisos y errores

- Correo permitido y cuenta existente con contraseña correcta: sesión administrativa válida.
- Correo permitido sin cuenta, contraseña incorrecta o correo no permitido: no hay sesión nueva.
- Sesión anterior de correo retirado: autenticación y rutas privadas rechazan el acceso.
- Lista ausente o mal formada en producción: acceso cerrado hasta corregir la configuración.

## Criterios de aceptación

- [ ] Solo los dos correos completos configurados pueden crear sesión en producción.
- [x] Una cuenta fuera de la lista no puede crear usuario o sesión, aunque tenga rol admin.
- [x] Una cookie ya emitida deja de autorizar cuando su correo sale de la lista.
- [x] Sin cuenta provisionada, un correo permitido no inicia sesión.
- [x] Las pruebas de desarrollo pueden usar cuentas QA con la variable sin configurar.
