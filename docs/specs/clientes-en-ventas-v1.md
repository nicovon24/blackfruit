# Clientes en ventas v1

## Actor, alcance y resultado

Un administrador selecciona un cliente existente o crea uno desde el formulario de alta/edición de venta. No necesita salir de la venta. La venta sin cliente sigue siendo válida. Se mantiene el indicador de clientes compradores. La gestión independiente de clientes y la vista de muestras quedan para después.

## Datos y reglas

- Nombre obligatorio para crear (hasta 160 caracteres); teléfono (40) y email (254) opcionales. Validación en servidor.
- La selección usa el ID del cliente. Nombres iguales nunca se fusionan automáticamente; mostrar una advertencia de coincidencia y datos de contacto para distinguirlos.
- Alta de cliente, vínculo, venta y auditoría comparten transacción. Un reintento de creación de venta no duplica cliente ni venta. Un conflicto de edición revierte también el nuevo cliente.
- Seleccionar «Sin cliente» al editar elimina únicamente el vínculo de esa venta, no el cliente.
- Anulación, papelera y restauración conservan el vínculo. Los compradores se cuentan por ID distinto entre ventas confirmadas y no borradas.
- Se reutilizan `customer`, `sale.customerId` y `audit_event`; no requiere migración.

## Autorización, estados y errores

Leer opciones exige `customers:read`; crear exige además `customers:write`. Las acciones mantienen `sales:write` y comprueban permisos en servidor. ID inválido o inexistente, nombre vacío y contacto inválido devuelven mensajes por campo. Estados: sin cliente, cliente seleccionado, creación desplegada, envío pendiente y error.

## Criterios de aceptación

- [x] Crear cliente con venta, recargar y ver su vínculo persistido.
- [x] Seleccionar ese mismo cliente en otra venta sin duplicarlo; cuenta una persona compradora.
- [x] Editar para cambiar/quitar cliente y conservar vínculo al anular/restaurar.
- [x] Reintento y edición en conflicto no crean clientes extra.
- [x] Rechazar cliente inexistente y datos inválidos; permisos comprobados.
- [x] Chrome escritorio/celular, typecheck, lint, build e integración.
