# Muestras v1

**Estado: desplegado en Vercel Production el 20/10/2026; migraciones verificadas en `dev/blackfruit`, en una rama aislada y en Neon `production`.** El significado operativo de la fecha y las unidades habituales siguen pendientes de definición con el usuario; falta QA autenticado publicado.

## Actor, resultado y reglas

El administrador registra destinatario, fecha de muestra, productos/variantes, cantidad y unidad explícita por línea, estado pendiente/entregada y notas opcionales. El contacto es opcional y se elige por ID; nunca se deduce por nombre. Una muestra no crea Sale ni interviene en ingresos, operaciones, ticket o compradores.

La fecha de muestra conserva el día indicado por el administrador sin inferir preparación ni entrega. Fecha de entrega es un campo separado opcional, solo permitido para estado entregada. Su significado operativo y las unidades usuales siguen pendientes de confirmación; por eso la unidad se exige expresamente y no se convierte automáticamente. Cantidades positivas exactas con hasta tres decimales. Producto y unidad históricos no cambian al editar el catálogo.

Estados operativos: pending/delivered. Estado de revisión de datos importados: pending/conflict/converted/ignored, separado del estado de entrega. Desconocido nunca equivale a pendiente de entrega.

## Pantallas y arquitectura

Listado con filtros, acceso «Venta / Muestra» desde el flujo de alta, detalle editable, contactos «Sin entrega registrada» y cola de importaciones por revisar. Los contactos se consultan por Customer.id; nombres sin vínculo no prueban entrega ni ausencia de entrega. El selector de contactos se comparte con Ventas, mientras que los formularios y entidades de negocio son independientes.

Sample y SampleLine son entidades distintas de Sale. SampleImportReview conserva datos parciales, clave lógica, firma del contenido, decisión y relación con muestra. ImportSourceRow mantiene raw, lote, hoja y fila, y un vínculo con la revisión; esta enlaza la muestra convertida. Descripciones y unidades se conservan como snapshots.

`samples:read/write`, `imports:read/write`, permisos de contactos y catálogo se verifican en servidor según cada operación. Creación/edición/conversión usan transacciones, idempotencia, versión y auditoría.

## Importación

- El usuario elige Venta/Muestra por operación. Muestras no requieren precios. Un estado explícito y todos los campos válidos permiten crear la muestra; datos incompletos se conservan en revisión.
- Nunca se asume entrega por color, importe cero o texto «muestra». La clasificación sugerida no es prueba de estado ni identidad.
- Una operación con varias filas produce como máximo una muestra. Reintentos y cargas concurrentes reconocen la misma procedencia.
- Las filas históricas se preparan para revisión de forma explícita. Se reconstruyen con configuración original; si no es posible se conservan sin inventar datos. No se reescribe el resultado histórico del lote.
- Igual procedencia e igual firma se vinculan a una revisión canónica; contenido cambiado produce conflicto. Coincidencia de nombre/contenido sin procedencia no fusiona personas ni operaciones.
- Convertir conserva todos los vínculos de origen; repetir la conversión devuelve la muestra existente.

La revisión está en `/muestras/revision`. La acción «Preparar filas para revisión» incorpora filas históricas sin inventar fecha, unidad, estado o vínculo con un contacto. Una fila con el mismo origen y contenido distinto conserva la muestra anterior, se muestra como conflicto y requiere revisión humana. El importe de origen, si existiera, permanece como procedencia y no genera ingresos.

## Aceptación

- Crear/recargar/editar muestra y cambiar estado conserva líneas y destinatario.
- Cero, negativos, más de tres decimales o unidad vacía se rechazan para cantidad.
- Crear contacto con muestra es atómico; reintentar no duplica ninguno.
- Indicadores de ventas quedan iguales antes/después de registrar o entregar muestras.
- Contacto con solo muestras pendientes aparece sin entrega; al entregar una vinculada deja de aparecer. Un nombre igual sin vínculo no cambia la consulta.
- Importación completa crea una muestra, incompleta queda en revisión, reintento no duplica y conflicto de origen se muestra.
- Conversión histórica mantiene raw y fecha/origen desconocidos hasta revisión explícita.
- Permisos, celular, teclado, errores y conflictos probados.

## Verificación del corte

Se probaron cantidades, unidades, fechas y vínculo explícito con contactos. En `dev/blackfruit`, una prueba de integración creó y limpió muestras QA, confirmó que las ventas no cambiaron, convirtió una importación sin precio, reconstruyó una fila histórica como revisión pendiente y detectó contenido cambiado como conflicto sin alterar la muestra anterior. Un recorrido de Chrome registró una muestra desde «Venta / Muestra». Pasaron `typecheck`, `lint` y `build`.
