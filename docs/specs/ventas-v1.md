# Especificación: registrar y gestionar ventas v1

**Estado:** venta por importe, clientes y ciclo de estados probados en PostgreSQL; importación de líneas disponible. Quedan alta/edición manual de líneas, gestión independiente de clientes/catálogo y accesibilidad completa. **Origen:** decisiones del negocio y mapeo de una hoja privada. Sigue el formato de capacidad de ECC (`product-capability`).

## Capacidad y resultado

Una persona administradora autenticada registra una venta en pocos pasos, vuelve a verla tras recargar la página, la corrige y puede anularla, enviarla a papelera o restaurarla. El dashboard refleja las operaciones vigentes del período usando PostgreSQL como fuente.

## Actores y superficies

- **Administrador:** crea, consulta, edita, anula, borra lógicamente, restaura y elimina definitivamente ventas desde la papelera.
- **Pantallas:** listado, formulario breve, detalle/edición, papelera y dashboard.
- **Servidor:** acciones de mutación y consultas que comprueban sesión y permiso; servicios de negocio para reglas y repositorios para PostgreSQL.

## Reglas e invariantes

1. Fecha obligatoria. Se admite una venta **por importe** o **por líneas**. Cliente, canal y notas son opcionales. Moneda inicial: ARS.
2. En modo por importe, el usuario indica un total positivo. En modo por líneas, cada cantidad y precio aplicado debe ser positivo; el servidor calcula subtotales y total en decimal exacto. El cliente no decide el total definitivo.
3. Una venta con varias líneas es una operación. Cada línea conserva nombre, variante, cantidad y precio aplicado históricos aunque cambie el catálogo.
4. `confirmed` y `void` distinguen venta vigente de anulada. `deleted_at` representa papelera independientemente del estado. Restaurar limpia `deleted_at` y conserva líneas, cliente, estado previo y procedencia.
5. Los indicadores incluyen solo ventas `confirmed` y no borradas del período: suma de totales, número de operaciones, ticket promedio (cero sin operaciones) y clientes identificados distintos con `customer_id`.
6. El nombre crudo de una fila importada se conserva en su procedencia. No se vincula automáticamente a un cliente por coincidencia de texto. Las muestras se registran en otra entidad y no aparecen en estos indicadores.
7. Cada cambio registra actor, acción y fecha en auditoría. Las consultas y mutaciones verifican permisos en el servidor, incluidos endpoints y exportaciones.
8. Nueva venta y detalle/edición abren en ventanas emergentes. Se puede seleccionar o crear cliente al guardar. Una venta importada con líneas permite actualizar fecha, cliente, canal y notas conservando total y líneas históricos.
9. Eliminar definitivamente exige que la venta esté en papelera y una confirmación explícita. Borra la venta y sus líneas en una transacción, conserva un evento de auditoría sin datos personales y rechaza versiones desactualizadas. Si la venta fue importada, conserva las filas de origen con `kind = deleted`, desvinculadas y sin clave de procedencia, para permitir una nueva carga revisada.

## Entradas, salidas y fallos

- **Crear/editar:** fecha local, modo, importe o líneas, cliente opcional, canal opcional y notas. Devuelve identificador, estado, total calculado y versión actual.
- **Consultar:** una operación o listado con filtros de fecha/estado y paginación; el dashboard devuelve agregados del mismo período.
- **Fallos:** entrada incompleta o inválida con campo concreto, sesión ausente, permiso insuficiente, registro inexistente y conflicto de edición concurrente. Ningún fallo parcial debe dejar líneas o auditoría desalineadas.
- **Reintento:** la creación manual no necesita referencia externa; la importación tendrá una clave idempotente propia en otra especificación. Un doble envío desde el formulario debe bloquearse o reconocerse de forma segura.

## Datos y límites

Tablas previstas: `sale`, `sale_line`, `customer`, `product`, `audit_event` y las de autenticación. Usar migraciones versionadas y claves foráneas. Evitar tipos o extensiones exclusivos de Neon para permitir restaurar en otro PostgreSQL. La fecha de operación se conserva como día local; marcas de auditoría usan instante con zona horaria.

No incluye gestión de cobros, costos, margen, stock, e-commerce ni sincronización continua con Sheets. El color rojo del archivo significa «falta cobrar», pero no alcanza para deducir importes pendientes de las filas actuales.

## Criterios de aceptación

- [x] Crear una venta por importe, recargar y encontrarla con el mismo importe y fecha.
- [ ] Crear una venta con dos líneas y comprobar total de servidor y **una** operación en el indicador de cantidad.
- [ ] Modificar el precio del catálogo y comprobar que la venta anterior conserva precio y descripción.
- [x] Editar una venta y ver los nuevos indicadores después de recargar.
- [x] Anular una venta, luego borrar/restaurar una venta, y comprobar importes, cantidad, relaciones y auditoría en cada estado.
- [x] Registrar una venta sin cliente y comprobar que suma a ventas, pero no a clientes identificados.
- [ ] Eliminar definitivamente una venta desde papelera, comprobar que no puede restaurarse y que su auditoría permanece; rechazar la operación sobre una venta activa o con versión desactualizada.
- [ ] Rechazar lectura o mutación sin sesión o permiso, también invocando directamente la acción o el endpoint.
- [ ] Probar el recorrido en escritorio y celular, con teclado y mensajes de error por campo.

## Decisiones pendientes y entrega

El peso/presentación de las seis variantes y el proveedor de email no bloquean esta capacidad. La cuenta administradora está provisionada en desarrollo; antes del uso cotidiano faltan recuperación por correo y backup/restauración probados. La venta por importe ya puede crearse, consultarse, editarse, anularse y restaurarse desde PostgreSQL. El recorrido pasó en Chrome a 1440 y 375 px; falta una revisión de accesibilidad y teclado más completa. La siguiente entrega incorporará líneas y vinculación revisada de clientes.
