# Importación revisada v1

## Resultado y usuario

El administrador descarga el XLSX de Sheets y lo carga desde «Importar». Elige hoja, verifica columnas, revisa operaciones, clientes, muestras y errores, confirma y obtiene un resultado conciliado. El archivo no se importa automáticamente al cargarlo.

La entrada habitual es el botón «Importar Excel» del dashboard, que abre el mismo asistente en un diálogo. La ruta protegida `/importar` permite acceso directo. El diálogo mantiene el resultado e historial a la vista después de confirmar; cerrar antes de confirmar requiere aceptar el descarte de la revisión local. El lote cargado ya permanece en la base de desarrollo, pero no crea ventas hasta la confirmación explícita.

## Alcance

- XLSX y CSV, hasta 2 MB, 10 hojas, 1.000 filas por hoja y 32 columnas. XLSX preserva colores y resultados almacenados de fórmulas, que nunca se ejecutan.
- Perfil BlackFruit: una fila por operación con seis cantidades y precios aplicados revisables. Fecha B, nombre C, cantidades D:I, total J y notas K; encabezado 16. Precios iniciales leídos de N3:N5 y N7:N9, sin inventar presentación.
- Perfil por importe: fecha e importe requeridos y campos opcionales mapeables. Perfil por líneas: referencia explícita de agrupación, producto, cantidad y precio; excluir una operación excluye todas sus líneas.
- Decimales y fechas explícitos en el mapeo. Totales/subtotales fuera del rango elegido se conservan en la copia de procedencia y no generan ventas.
- Las muestras quedan conservadas como registros de origen clasificados; sin tabla/vista independiente por ahora. Filas inválidas se corrigen en el archivo o se excluyen expresamente.
- Una muestra revisada puede tener importe cero. Se conserva como procedencia clasificada, suma una muestra al resumen y no crea una venta ni aumenta ingresos. Las ventas siguen requiriendo un importe positivo.
- En la revisión se puede excluir una fila u operación agrupada mediante «Borrar fila»; conserva su origen como excluida. También se puede indicar un monto positivo corregido para una venta, incluso si el archivo dice cero. Esa operación se guarda como venta por importe, sin líneas de producto; las líneas y valores originales quedan en la procedencia. La corrección no cambia el archivo ni las demás operaciones.
- Nombres de origen no crean identidades automáticamente. El usuario puede vincular un cliente existente o conservar el nombre sin vínculo.

## Persistencia y garantías

`import_batch` guarda una copia estructurada del archivo, configuración, actor y resultado; `import_source_row` conserva hoja, fila, fórmulas, colores, decisiones y vínculo. La fuente lógica es estable entre cargas para detectar filas ya importadas. Archivo cambiado en una fila previamente importada produce conflicto, no una venta nueva.

Cuando se elimina definitivamente una venta importada, sus filas pasan a `kind = deleted`, conservan el origen crudo y pierden `saleId` y `originKey`. La misma procedencia puede volver a cargarse para una revisión nueva. La restricción de la tabla debe admitir ese estado; el cambio se aplica en una migración posterior a la creación de `import_source_row`.

La revisión se valida y firma por hash en servidor. Confirmar verifica permisos y revisión vigente; recalcula líneas y totales, conserva descripción/precio históricos, escribe ventas/procedencia/auditoría en una transacción y concilia cantidades/importes. Un reintento del lote confirmado devuelve su resultado. La unicidad de procedencia evita duplicados entre cargas concurrentes. Las exclusiones y filas duplicadas se muestran antes de confirmar.

Cambiar tratamiento o monto invalida la confirmación anterior. «Actualizar revisión» recalcula importes, unidades y errores; el servidor valida montos exactos con dos decimales, mayores que cero. Las filas ya importadas no se pueden cambiar en este lote.

## Permisos y errores

`imports:read` para vistas/resultados; `imports:write` y `sales:write` para confirmar. `customers:read` para opciones y vinculación. Archivo inválido, límites, campo/hoja/fila incorrectos, cliente inexistente, conflicto de origen y revisión desactualizada se explican sin exponer secretos.

## Aceptación

- [x] Un XLSX privado se concilió en desarrollo sin confirmar su importación; las cantidades e importes se conservan fuera del repositorio.
- [x] Selección/mapeo, errores por fila/campo, exclusión explícita y vinculación revisada de clientes.
- [x] CSV por importe y operaciones agrupadas por referencia.
- [x] Confirmación/reintento/recarga, duplicados y rollback de errores; conciliación desde PostgreSQL.
- [x] Interfaz y confirmación utilizables en escritorio/celular.
- [ ] Excluir una fila con el botón, recalcular y confirmar sin crear venta, conservando su origen.
- [ ] Corregir una fila de importe cero a 1.000,00; recalcular y confirmar una venta por importe con ese valor. Rechazar cero, negativos y más de dos decimales.
- [ ] Corregir el total de una fila con líneas; guardar una sola venta por importe y conservar las líneas originales solo en la procedencia.
- [x] Clasificar una fila de importe cero como muestra; actualizar la revisión y confirmarla sin error de total, sin crear una venta y conservando la fila de origen.

## Operación

No se cargan las ventas reales durante el desarrollo: el usuario confirma su migración desde la app. Las pruebas escriben y eliminan únicamente sus lotes y datos QA en `dev/blackfruit`. El rollback de la migración de esquema requiere retirar primero la función; no borrar las tablas con datos confirmados. En producción, los cambios posteriores se hacen con otra migración.
