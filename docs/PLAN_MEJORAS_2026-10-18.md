# Mejoras de uso y escala

Estado: implementado y verificado en `dev/blackfruit` el 18/10/2026; pendiente de despliegue.

Actualización del 18/10/2026: este documento describe el corte ya verificado de fechas, clientes, muestras, producción, Excel y consultas acotadas. El nuevo corte de popups de clientes, edición de productos y papelera reversible se sigue en [la especificación 010](specs/backend/010-papelera-catalogo-v1.md) y en [el plan general](PLAN_IMPLEMENTACION.md). La caché persistente continúa como estrategia condicionada a mediciones; no está activada. Los ciclos DEMO se limpiaron en desarrollo mediante `scripts/cleanup-production-example.ts`; el script conserva vista previa por defecto, requiere `--execute` para borrar y rechaza entornos ajenos a `dev/blackfruit`.

El administrador puede crear y reutilizar clientes desde una agenda, registrar muestras desde un diálogo, consultar períodos automáticamente en Inicio, importar ciclos de producción desde XLSX y explorar datos ficticios de producción en la rama de desarrollo. Las consultas quedan acotadas y los agregados se calculan en el servidor.

Producción usa la fecha real de finalización existente (`finishedOn`), sin agregar otra fecha. Todos los campos de fecha completa y sus valores visibles usarán `dd/mm/yyyy`. La persistencia conserva `DATE` y los contratos internos `yyyy-mm-dd`.

Orden de entrega: fechas compartidas; agenda y selector; diálogo de muestras; períodos; ejemplo en desarrollo; importación de producción; rendimiento medido. Cada corte sigue las especificaciones de `docs/specs/`, incluye comprobaciones de mayor riesgo y termina con `typecheck`, `lint` y `build`.

La importación usa dos hojas: `Ciclos`, una fila por ciclo, y `Pesajes`, una fila por resultado con las bandejas separadas por coma. Los códigos existentes se marcan como conflicto y bloquean la confirmación; no se sobrescriben. La plantilla se descarga desde la app. El usuario aceptó probar este formato, sujeto a ajustes cuando aporte su planilla habitual.

El ejemplo de producción es identificable e idempotente en `dev/blackfruit`: `DEMO-SEP-2026`, `DEMO-OCT-2026` y `DEMO-BORRADOR-2026`. Se puede volver a cargar con `node --env-file=.env.local --import tsx scripts/seed-production-example.ts`; el script rechaza otras ramas. Fue limpiado el 18/10/2026 por pedido explícito. Las dos migraciones nuevas se aplicaron en `dev/blackfruit`, no en `production`.

Rendimiento implementado: búsqueda y paginación de 30 clientes y ventas por página; 30 opciones iniciales en selectores con búsqueda remota; 30 ciclos por página; cinco ventas recientes en Inicio; conteo de compradores con `COUNT(DISTINCT)` en PostgreSQL, sin transferir todos los IDs; agregación por fecha en PostgreSQL; índice `(name,id)` para la agenda. Los índices de fecha, estado y máquina ya existían. La consulta de Inicio se probó con 32 ventas históricas y 31 puntos diarios de octubre.

Estrategia de caché: mantener sesión, permisos, formularios, clientes editables y detalles de ciclos sin caché compartida. La paginación y agregación reducen primero el volumen transferido. Medir p95 y `EXPLAIN (ANALYZE, BUFFERS)` con datos representativos; si Inicio supera 500 ms p95 o los historiales crecen a decenas de miles de filas, cachear solo agregados por período y máquina durante 30–60 segundos, siempre después de autorizar, con invalidación al guardar, anular, restaurar o importar. Si se despliega en varias instancias, usar un almacén compartido antes de depender de caché de proceso. Evaluar índices trigram para búsquedas `contains` y compuestos para la paginación a partir de planes reales, no por cantidad de índices deseada. No se activó caché persistente prematuramente, para evitar mostrar totales obsoletos tras una venta.

Verificación: pruebas de fechas e importación, integración de dashboard y XLSX, recorrido Chrome de agenda, períodos y popup con capturas en escritorio y 375 px. `npm run typecheck`, `npm run lint` y `npm run build` pasaron; el detector de Impeccable no reportó hallazgos.
