# Importación y papelera v1

Este documento reúne las reglas de importación de ventas/muestras y producción, y las reglas de papelera reversible. Son flujos relacionados por procedencia y protección de datos; cada capacidad conserva sus estados y criterios independientes.

## Importación de ventas y muestras

## Resultado y usuario

El administrador descarga el XLSX de Sheets y lo carga desde «Importar». Elige hoja, verifica columnas, revisa operaciones, clientes, muestras y errores, confirma y obtiene un resultado conciliado. El archivo no se importa automáticamente al cargarlo.

La entrada habitual es el botón «Importar Excel» del dashboard, que abre el mismo asistente en un diálogo. La ruta protegida `/importar` permite acceso directo. El diálogo mantiene el resultado e historial a la vista después de confirmar; cerrar antes de confirmar requiere aceptar el descarte de la revisión local. El lote cargado ya permanece en la base de desarrollo, pero no crea ventas hasta la confirmación explícita.

## Alcance

- XLSX y CSV, hasta 2 MB, 10 hojas, 1.000 filas por hoja y 32 columnas. XLSX preserva colores y resultados almacenados de fórmulas, que nunca se ejecutan.
- Perfil BlackFruit: una fila por operación con seis cantidades y precios aplicados revisables. Fecha B, nombre C, cantidades D:I, total J y notas K; encabezado 16. Precios iniciales leídos de N3:N5 y N7:N9, sin inventar presentación.
- Perfil por importe: fecha e importe requeridos y campos opcionales mapeables. Perfil por líneas: referencia explícita de agrupación, producto, cantidad y precio; excluir una operación excluye todas sus líneas.
- Decimales y fechas explícitos en el mapeo. Totales/subtotales fuera del rango elegido se conservan en la copia de procedencia y no generan ventas.
- La revisión permite elegir Venta o Muestra por operación. Una muestra completa con estado explícito crea `Sample` y sus líneas sin requerir precio. Datos incompletos quedan en `SampleImportReview`, vinculados con las filas de origen para revisión posterior; las filas históricas se pueden incorporar a esa cola sin inventar información.
- Una muestra revisada puede tener importe cero. Suma una muestra al resumen de importación y no crea una venta ni aumenta ingresos. Las ventas siguen requiriendo un importe positivo.
- En la revisión se puede excluir una fila u operación agrupada mediante «Borrar fila»; conserva su origen como excluida. También se puede indicar un monto positivo corregido para una venta, incluso si el archivo dice cero. Esa operación se guarda como venta por importe, sin líneas de producto; las líneas y valores originales quedan en la procedencia. La corrección no cambia el archivo ni las demás operaciones.
- El primer paso del asistente ofrece «Descargar archivo de ejemplo (CSV)» (`public/ejemplo-importacion.csv`): perfil por importe con columnas Fecha, Nombre y Total, datos ficticios y sin errores. Es un archivo público; nunca debe contener datos reales.
- Nombres de origen no crean identidades automáticamente. El usuario puede vincular un cliente existente o conservar el nombre sin vínculo.

## Persistencia y garantías

`import_batch` guarda una copia estructurada del archivo, configuración, actor y resultado; `import_source_row` conserva hoja, fila, fórmulas, colores, decisiones y vínculo. La fuente lógica es estable entre cargas para detectar filas ya importadas. Archivo cambiado en una fila previamente importada produce conflicto, no una venta nueva.

Una venta importada movida a papelera conserva sus líneas, `saleId` y `originKey`; la misma procedencia sigue detectándose como duplicada. El estado `kind = deleted` del esquema queda como compatibilidad histórica y no se genera desde la aplicación.

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


## Importación de producción


Actor: administrador. Resultado: cargar XLSX, revisar ciclos y confirmar registros de producción con su fecha real de finalización.

Reglas ya fijadas: el servidor valida máquina, catálogo, bandejas y pesajes con las reglas del ciclo manual; el peso conjunto se suma una vez; el archivo no modifica ciclos sin revisión. El origen conserva lote, hoja y filas; reintentos no duplican. `production:write` e `imports:write` protegen la confirmación. Los conflictos se presentan antes de escribir. La vista previa separa válidos, errores y duplicados.

Decisión del 18/10/2026: la plantilla propuesta se prueba con dos hojas. `Ciclos` contiene una fila por ciclo con `codigo`, `fecha`, `maquina`, `total_kg` y `observaciones`; `Pesajes` contiene una fila por resultado con `codigo`, `producto`, `variante`, `bandejas` y `kg`. `bandejas` enumera posiciones separadas por coma, de modo que un pesaje agrupado mantiene un solo peso. La suma de `Pesajes.kg` debe coincidir exactamente con `Ciclos.total_kg`. La plantilla muestra fechas `dd/mm/yyyy`.

Un código de ciclo existente se marca como conflicto para revisión; no se actualiza ni se omite en silencio. Un archivo idéntico ya confirmado se reconoce por procedencia y no duplica ciclos. El usuario aceptó probar esta estructura propuesta; el mapeo contra su planilla habitual se podrá adaptar después sin cambiar las reglas de los ciclos.

Estados: carga, revisión, conflicto, confirmación y resultado. La plantilla define las columnas; no hay mapeo libre en esta versión. Aceptación: un ciclo con grupo conserva su peso, fechas válidas se guardan, una vista previa con errores o conflictos no se confirma, repetir la carga no duplica y un conflicto nunca reemplaza datos en silencio. La confirmación es idempotente por archivo y código; cada ciclo se guarda de forma atómica. Si un lote con varios ciclos se interrumpe, el reintento completa los restantes sin duplicar los ya guardados.


## Papelera reversible

Actor: administrador autenticado. Resultado: consultar registros eliminados de forma lógica y restaurarlos sin perder relaciones ni historial.

Papelera: /papelera con pestañas ventas, clientes, ciclos y muestras, búsqueda y páginas de 30 registros. Estado activo → papelera → restaurado; se conserva el estado operativo anterior. Los detalles en papelera no se pueden editar. Las consultas operativas y agregados excluyen deletedAt; los contactos sin muestras entregadas excluyen entregas en papelera. Productos y máquinas usan archivo y no participan en esta papelera.

En el Dashboard de producción, cada fila de ciclo finalizado o borrador permite enviarlo directamente a papelera con confirmación. La operación usa el mismo permiso, control de versión, auditoría y restauración que la acción del detalle.

Datos: deletedAt en Customer, ProductionCycle y Sample; version en Customer y Product. Las operaciones comprueban permiso de escritura del módulo, ID, versión y estado dentro de una transacción y generan auditoría. No se copian entidades a una tabla de papelera. Mantener códigos, requestKey, procedencia y claves de importación evita duplicados al reimportar. La URL antigua de ventas redirige a la pestaña ventas.

Decisión revisada: la aplicación ofrece solo borrado reversible. Se retiró la acción de borrado físico anterior de ventas. El borrado definitivo de prueba se realiza por script separado, con vista previa por defecto, lista explícita de entidades DEMO, comprobación de rama y endpoint de desarrollo, transacción y rechazo ante relaciones ajenas al ejemplo. Nunca se limpia por coincidencia de nombres ni se vacía la base. Los tres ciclos, dos productos y la máquina DEMO se limpiaron en `dev/blackfruit` el 18/10/2026 por pedido explícito; el script queda disponible para ejemplos futuros.

Errores: versión obsoleta, registro ya movido/restaurado, cliente con asociaciones, producto archivado para una asignación nueva. Se conserva el formulario y se muestra un mensaje accionable. Diálogos accesibles con retorno de foco y confirmación de cambios sin guardar.

Aceptación: mover una venta, ciclo o muestra a papelera excluye su efecto operativo sin perder relaciones; restaurar recupera el registro y revierte ese efecto; un cliente con ventas o muestras asociadas no puede eliminarse, incluso ante concurrencia; volver a importar una operación en papelera no la duplica; no hay acción de borrado físico desde la aplicación. El script de limpieza de ejemplos usa vista previa, permite solo entidades explícitas de desarrollo y rechaza producción o dependencias externas.

Verificación: pruebas de integración, recorrido de escritorio y celular, typecheck/lint/build. Migración aditiva probada solo en dev/blackfruit. Para revertir el despliegue, restaurar los registros en papelera antes de volver a código que no filtra deletedAt; conservar las columnas. No desplegar a production en este corte.

La creación y edición del catálogo de clientes/productos se detalla en [Agenda y catálogo](006-agenda-clientes-catalogo-v1.md). Esta sección contiene las reglas compartidas de eliminación reversible, restauración y procedencia.
