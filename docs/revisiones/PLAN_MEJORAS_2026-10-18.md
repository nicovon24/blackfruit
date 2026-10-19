# Mejoras de uso y escala: plan y resultado

Fecha: 18/10/2026

Estado: implementado y verificado en `dev/blackfruit`; pendiente de despliegue.

Este es el documento único del análisis, las decisiones y el resultado del corte de clientes, muestras, fechas, producción y rendimiento. Se conserva en `docs/revisiones/` porque también registra el diagnóstico y el plan original. `docs/CHECKLOG.md` enlaza aquí y resume el estado operativo; los contratos y criterios detallados viven en las especificaciones de `docs/specs/`.

## Objetivo y decisiones confirmadas

El corte buscó que el equipo pudiera registrar y reutilizar clientes, registrar muestras sin salir de la pantalla, consultar ventas por distintos períodos, importar producción desde Excel y manejar más datos sin cargar historiales completos.

- Producción usa `ProductionCycle.finishedOn`, la fecha real de finalización ya existente. No se agregó otra fecha ni hizo falta una migración para esa decisión.
- Los campos de fecha completa y sus valores visibles usan `dd/mm/yyyy`. La persistencia sigue usando `DATE` y los contratos internos `yyyy-mm-dd`.
- El importador de producción usa dos hojas: `Ciclos`, una fila por ciclo, y `Pesajes`, una fila por resultado con las bandejas separadas por coma. Un peso agrupado se suma una sola vez.
- Si el Excel trae un código de ciclo existente, se muestra como conflicto y no se sobrescribe automáticamente.
- Se preparó un ejemplo ficticio para explorar el dashboard en desarrollo. Se retiró después de la prueba; el script de carga permanece disponible y restringido a `dev/blackfruit`.
- La caché persistente no se activó. Primero se redujeron y paginaron consultas; caché queda condicionada a mediciones representativas.

## Alcance y resultado

| Área | Resultado del corte |
| --- | --- |
| Fechas | Campo compartido y formato uniforme `dd/mm/yyyy`; se mantiene el día de negocio sin desplazamientos por zona horaria. |
| Clientes | Agenda paginada y búsqueda remota; selección reutilizable por ID en ventas y muestras. |
| Muestras | Alta en diálogo, separada de ventas, con conservación del formulario ante errores y revisión de estados. |
| Dashboard de ventas | Cambio automático de período; mes, rango e histórico; agregados calculados en servidor. |
| Producción | Fecha de finalización visible, importación XLSX con plantilla y revisión, conflictos explícitos y dashboard por período. |
| Consultas | Historiales y selectores acotados; conteos y series agregados en PostgreSQL; paginación estable. |
| Datos de ejemplo | Carga idempotente para desarrollo y limpieza protegida. Los ejemplos se retiraron de la base al terminar la exploración. |

El corte posterior de catálogo, formularios emergentes y papelera reversible se registra en la [especificación de catálogo y papelera](../specs/backend/010-papelera-catalogo-v1.md) y en el [CHECKLOG](../CHECKLOG.md), no en este corte.

## Rendimiento y estrategia de caché

Se implementaron páginas de 30 clientes, ventas y ciclos; selectores que muestran 30 opciones iniciales y buscan más bajo demanda; cinco ventas recientes en Inicio; `COUNT(DISTINCT)` para compradores; agregación diaria/mensual en PostgreSQL; y el índice `(name,id)` para la agenda. Los índices existentes de fecha, estado y máquina se conservaron. El dashboard se probó con 32 ventas históricas y 31 puntos diarios en octubre.

La estrategia acordada es medir antes de agregar caché o índices. Con datos representativos, medir p95, filas transferidas y `EXPLAIN (ANALYZE, BUFFERS)`. Si Inicio supera 500 ms p95 o los historiales llegan a decenas de miles de filas, evaluar caché de agregados por período y máquina con TTL de 30–60 segundos e invalidación después de guardar, anular, restaurar o importar. Autorizar antes de leer datos cacheados; mantener sesiones, permisos, formularios y detalles editables fuera de caché compartida. Para varias instancias, usar un almacén compartido. Evaluar índices trigram y compuestos según los planes observados, no por anticipación.

## Verificación y trabajo pendiente

La verificación del corte en desarrollo incluyó pruebas de fechas e importación, integración de dashboard e importación XLSX y recorridos de navegador de agenda, períodos y diálogo, en escritorio y a 375 px. `npm run typecheck`, `npm run lint` y `npm run build` pasaron; la revisión visual con Impeccable no reportó hallazgos.

Queda pendiente desplegar las migraciones y el código, realizar QA en el entorno publicado y medir consultas con volumen representativo antes de decidir si activar caché o sumar índices. El ensayo completo de restauración del entorno también sigue pendiente; está registrado en `docs/CHECKLOG.md`.

La propuesta original y sus criterios fueron refinados durante la implementación. Para el estado actual prevalecen esta tabla y las especificaciones enlazadas, no las estimaciones iniciales del plan.
