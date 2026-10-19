# Clientes, catálogo y papelera reversible

Actor: administrador autenticado. Resultado: crear clientes y productos desde diálogos, editar el catálogo y recuperar registros enviados a papelera.

Clientes: lista paginada y búsqueda; alta por diálogo con validación e idempotencia. Solo un cliente sin ventas ni muestras (incluidas las eliminadas lógicamente) puede ir a papelera. La comprobación y el cambio son atómicos; las nuevas asociaciones bloquean la misma fila del cliente. No se fusionan homónimos.

Productos: alta y edición de nombre, variante y unidad por diálogo, archivar/reactivar con control de versión. Archivar impide nuevas asignaciones; editar o archivar nunca reescribe las descripciones históricas. Al corregir una muestra o ciclo se conservan los nombres guardados de los productos ya presentes.

Papelera: /papelera con pestañas ventas, clientes, ciclos y muestras, búsqueda y páginas de 30 registros. Estado activo → papelera → restaurado; se conserva el estado operativo anterior. Los detalles en papelera no se pueden editar. Las consultas operativas y agregados excluyen deletedAt; los contactos sin muestras entregadas excluyen entregas en papelera. Productos y máquinas usan archivo y no participan en esta papelera.

Datos: deletedAt en Customer, ProductionCycle y Sample; version en Customer y Product. Las operaciones comprueban permiso de escritura del módulo, ID, versión y estado dentro de una transacción y generan auditoría. No se copian entidades a una tabla de papelera. Mantener códigos, requestKey, procedencia y claves de importación evita duplicados al reimportar. La URL antigua de ventas redirige a la pestaña ventas.

Decisión revisada: la aplicación ofrece solo borrado reversible. Se retiró la acción de borrado físico anterior de ventas. El borrado definitivo de prueba se realiza por script separado, con vista previa por defecto, lista explícita de entidades DEMO, comprobación de rama y endpoint de desarrollo, transacción y rechazo ante relaciones ajenas al ejemplo. Nunca se limpia por coincidencia de nombres ni se vacía la base. Los tres ciclos, dos productos y la máquina DEMO se limpiaron en `dev/blackfruit` el 18/10/2026 por pedido explícito; el script queda disponible para ejemplos futuros.

Errores: versión obsoleta, registro ya movido/restaurado, cliente con asociaciones, producto archivado para una asignación nueva. Se conserva el formulario y se muestra un mensaje accionable. Diálogos accesibles con retorno de foco y confirmación de cambios sin guardar.

Aceptación: alta por popup y reuso; editar producto y luego muestra/ciclo conserva sus descripciones; papelera modifica listados y totales sin perder relaciones; restaurar revierte ese efecto; cliente asociado no se elimina ni ante concurrencia; importaciones no recrean eliminados; no hay acción de borrado físico de ventas. Script: vista previa no modifica datos, rechaza producción y dependencias externas y puede limpiar un ejemplo aislado en desarrollo.

Verificación: pruebas de integración, recorrido de escritorio y celular, typecheck/lint/build. Migración aditiva probada solo en dev/blackfruit. Para revertir el despliegue, restaurar los registros en papelera antes de volver a código que no filtra deletedAt; conservar las columnas. No desplegar a production en este corte.
