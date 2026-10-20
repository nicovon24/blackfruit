# Agenda de clientes y catálogo v1


Actor: administrador autenticado. Resultado: administrar datos de contacto de una persona fuera de una venta, encontrarla y reutilizarla por ID en Ventas y Muestras. El nombre es obligatorio; teléfono y email son opcionales. Una venta puede seguir sin cliente.

## Reglas, datos y permisos

- Se usa la entidad `Customer` existente. Nombres iguales no se fusionan; las opciones muestran datos de contacto para distinguir homónimos.
- El alta y la edición aplican la validación compartida: nombre obligatorio, hasta 160 caracteres; email válido y hasta 254; teléfono hasta 40. Se normalizan espacios. Los campos opcionales vacíos se guardan como `null`.
- Alta independiente y edición requieren `customers:write`; lectura y selección requieren `customers:read`. Las comprobaciones ocurren en el servidor. Cada cambio registra actor y acción en auditoría.
- La agenda y el selector están paginados y buscan por nombre, teléfono o email. El cliente elegido permanece disponible aunque no esté en la primera página.
- Editar un cliente conserva su ID, sus asociaciones y los snapshots de líneas históricas. Una venta vinculada consulta el nombre actualizado. Una muestra mantiene el destinatario registrado en su momento y conserva el vínculo al contacto actualizado.
- Alta o selección desde Ventas conserva las reglas de la [especificación de ventas](002-ventas-v1.md): vínculo por ID, operación atómica, sin duplicar clientes en reintentos, y «Sin cliente» solo quita el vínculo de esa venta.
- No se edita desde papelera. Un cliente asociado a ventas o muestras, incluso en papelera, no se puede enviar a papelera. El estado reversible y su concurrencia se rigen por [clientes, catálogo y papelera](003-importacion-papelera-v1.md).
- La edición usa `version` para detectar datos obsoletos. Si el cliente se archivó en papelera o cambió desde que se abrió el diálogo, no sobrescribe el registro; la transacción de cambio y auditoría es atómica. No requiere migración adicional.

## Estados y errores

Estados: agenda vacía, resultados, sin coincidencias, cargando búsqueda, diálogo limpio/modificado, guardando, guardado, error por campo y conflicto. El formulario mantiene lo ingresado ante errores; al descartar cambios pide confirmación. El conflicto permite cerrar y volver a abrir la versión vigente. Tras guardar, la agenda y las vistas de cliente en Ventas y Muestras se actualizan.

## Aceptación

- Crear un cliente en la agenda, recargar, seleccionarlo en ventas y muestras, y comprobar que se mantiene el mismo ID.
- Distinguir homónimos por teléfono/email, buscar más allá de la primera página y reintentar un alta sin duplicar.
- Editar nombre, teléfono y email desde la fila; comprobar que el ID y las asociaciones se conservan, que los formularios muestran los datos actuales y que la auditoría se registra.
- Rechazar nombre/email inválidos sin perder el borrador; rechazar una versión vieja o un cliente en papelera sin actualizarlo ni crear auditoría.
- Cancelar una edición con confirmación si hay cambios; probar teclado, Escape, retorno del foco, escritorio y celular.

## Verificación del corte de edición

El 19/10/2026, `tests/customer-edit-integration.ts` verificó datos normalizados, vínculo existente con venta y muestra, importe histórico intacto, auditoría, rechazo de versión vieja, datos inválidos y cliente en papelera. `tests/trash-browser.ts` verificó edición de escritorio/celular, error con borrador conservado, cancelar y confirmar el descarte. Pasaron typecheck, lint y build; no requiere migración. Se desplegó el 20/10/2026 y falta QA autenticado en la URL publicada.


## Catálogo de productos

El administrador consulta productos activos y archivados, busca en el listado y crea o edita nombre, variante y unidad desde diálogos. Puede archivar o reactivar con control de versión. Archivar impide nuevas asignaciones; editar o archivar nunca reescribe descripciones históricas. Al corregir una muestra o ciclo se conservan los nombres guardados de los productos ya presentes.

### Aceptación del catálogo

- Crear y editar un producto actualiza la lista; archivar impide asignarlo en nuevas muestras/ciclos y reactivar vuelve a permitirlo.
- Una modificación del catálogo no altera descripciones históricas de ventas, muestras ni ciclos.
- Conflictos de versión se informan y no sobrescriben cambios concurrentes.
