# Mejoras de BlackFruit: resultados y próximo corte visual

Fecha: 18/10/2026

Estado: mejoras de uso y escala implementadas y verificadas en `dev/blackfruit`, pendientes de despliegue. Modernización de componentes, layouts y modo oscuro implementada localmente el 19/10/2026; resultados y límites de verificación abajo.

Este es el documento único del análisis, las decisiones y el resultado del corte de clientes, muestras, fechas, producción y rendimiento, y del próximo corte de componentes visuales. Se conserva en `docs/revisiones/` porque también registra el diagnóstico y el plan original. `docs/CHECKLOG.md` enlaza aquí y resume el estado operativo; los contratos y criterios detallados viven en las especificaciones de `docs/specs/`.

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

El corte posterior de catálogo, formularios emergentes y papelera reversible se registra en la [especificación de catálogo y papelera](../specs/backend/003-importacion-papelera-v1.md) y en el [CHECKLOG](../CHECKLOG.md), no en este corte.

## Rendimiento y estrategia de caché

Se implementaron páginas de 30 clientes, ventas y ciclos; selectores que muestran 30 opciones iniciales y buscan más bajo demanda; cinco ventas recientes en Inicio; `COUNT(DISTINCT)` para compradores; agregación diaria/mensual en PostgreSQL; y el índice `(name,id)` para la agenda. Los índices existentes de fecha, estado y máquina se conservaron. El dashboard se probó con 32 ventas históricas y 31 puntos diarios en octubre.

La estrategia acordada es medir antes de agregar caché o índices. Con datos representativos, medir p95, filas transferidas y `EXPLAIN (ANALYZE, BUFFERS)`. Si Inicio supera 500 ms p95 o los historiales llegan a decenas de miles de filas, evaluar caché de agregados por período y máquina con TTL de 30–60 segundos e invalidación después de guardar, anular, restaurar o importar. Autorizar antes de leer datos cacheados; mantener sesiones, permisos, formularios y detalles editables fuera de caché compartida. Para varias instancias, usar un almacén compartido. Evaluar índices trigram y compuestos según los planes observados, no por anticipación.

## Verificación y trabajo pendiente

La verificación del corte en desarrollo incluyó pruebas de fechas e importación, integración de dashboard e importación XLSX y recorridos de navegador de agenda, períodos y diálogo, en escritorio y a 375 px. `npm run typecheck`, `npm run lint` y `npm run build` pasaron; la revisión visual con Impeccable no reportó hallazgos.

Queda pendiente desplegar las migraciones y el código, realizar QA en el entorno publicado y medir consultas con volumen representativo antes de decidir si activar caché o sumar índices. El ensayo completo de restauración del entorno también sigue pendiente; está registrado en `docs/CHECKLOG.md`.

La propuesta original y sus criterios fueron refinados durante la implementación. Para el estado actual prevalecen esta tabla y las especificaciones enlazadas, no las estimaciones iniciales del plan.

## Corte: componentes editoriales y premium

Estado: implementado localmente después de la aprobación del usuario. El intento visual anterior se descartó antes de preparar el análisis; esta implementación sigue el alcance ampliado A/B/C. Las verificaciones propias de este corte se registran al final; no se heredan de los cortes funcionales anteriores.

Ampliación solicitada el 18/10: tablas, inputs, formularios, tamaños, layouts, filtros de fechas, buscadores, botones con más presencia y modo oscuro. El [análisis previo de componentes y temas](REVISION_COMPONENTES_2026-10-18.md) documenta evidencia, problemas concretos, impacto/esfuerzo y decisiones de implementación. Esta ampliación sustituye el alcance reducido anterior de cinco mejoras aisladas.

### Objetivo y límites acordados

Mejorar la calidad visual y las interacciones de los componentes compartidos, con una dirección **más editorial y premium**. Mantener la identidad cálida de BlackFruit: carbón, crema, superficies claras y acentos de marca; usar la tipografía serif existente en títulos y la sans serif en formularios y datos. El resultado debe sentirse coherente y cuidado, con jerarquía clara, espacio útil y controles legibles.

Se mantienen 2–3 referencias de shadcn y dashboards. El trabajo se divide en tres entregas: base visual/listas, formularios/diálogos y modo oscuro completo. Incluye adaptación de colores del entorno del visor 3D, sin rediseñar la máquina ni sus controles. No incluye reorganizar el sidebar, cambiar reglas de negocio, modificar datos ni migrar la base. Tampoco incluye push, merge o despliegue.

### Referencias y patrones a adaptar

| Referencia | Aplicación prevista en BlackFruit |
| --- | --- |
| [Dashboard de shadcn/ui](https://ui.shadcn.com/examples/dashboard) | Jerarquía entre título, acciones, métricas y datos; composición de controles y tablas. |
| [Bloques de dashboard de shadcn/ui](https://ui.shadcn.com/blocks?category=dashboard) | Consistencia entre superficies y componentes; alineación de encabezados y adaptación responsive. |
| [Dashboard administrativo con Next.js y shadcn/ui en Vercel](https://examples.vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard) | Referencia adicional para densidad, organización y estados de controles administrativos. |

Referencias consultadas en el análisis; volver a contrastarlas con la propuesta al implementar. Son referencias de composición e interacción, no plantillas para reemplazar la marca. Para temas, seguir la [guía oficial de shadcn con Next.js](https://ui.shadcn.com/docs/dark-mode/next), con la única dependencia nueva propuesta `next-themes`.

### Entregas y orden de implementación

| Entrega | Alcance | Resultado esperado |
| --- | --- | --- |
| A. Base visual y listas | Tokens claros/oscuros, escala de tamaños, botones, inputs de toolbar, buscadores, filtros de fechas, encabezados, tablas, layouts y estados vacíos. | Controles alineados de 44 px, acciones secundarias tonales, búsquedas acotadas en escritorio y tablas legibles. Muestras sin controles duplicados ni «Página 1» innecesaria cuando no hay registros. |
| B. Formularios y diálogos | Campos con etiqueta/ayuda/error coherentes, select/textarea compartidos, formularios de página y modal con distinta composición, diálogos e importación. | Menos paneles anidados, lectura clara, acciones accesibles, validaciones y foco conservados. |
| C. Modo oscuro completo | Proveedor, selector Claro/Oscuro/Sistema, persistencia, superficies, estados, gráficos, login e interfaz del visor. | Preferencia Sistema inicial, clave local `blackfruit-theme`, primer pintado correcto y cobertura completa sin perder formularios al cambiar tema. |

La implementación se concentra en presentación y tokens. La nueva capacidad de tema justifica `next-themes`; esta decisión reemplaza la restricción anterior de no agregar ninguna dependencia. No se incorporan fuentes ni bibliotecas de tablas/formularios nuevas. Las transiciones cortas de color y opacidad respetan `prefers-reduced-motion`. No cambian API del servidor ni contratos de datos. Los detalles de tamaños, anchos, componentes, comportamiento de filtros y temas están fijados en el análisis enlazado.

Inicio conserva actualización automática, rangos y fechas `dd/mm/yyyy`. Las búsquedas mantienen envío por Enter/botón y los filtros de Producción su aplicación explícita. No agregar rangos a Producción ni búsqueda automática general como efecto secundario. Muestras con registros usa el ancho útil; sin registros, contenido compacto y una acción pertinente, sin estirar la tabla a la altura de pantalla. No fabricar datos ni totales para completar espacios.

Antes de editar interfaz, leer AGENTS.md, README.md, CHECKLOG y las especificaciones relacionadas; usar las skills locales Impeccable y UI UX Pro Max. Registrar el corte en una especificación de frontend con estados y criterios observables. Revisar las guías locales de Next.js pertinentes si se modifica código de componentes. Aplicar estilos compartidos sin trasladar reglas de negocio a presentación.

### Criterios de aceptación

- Capturar antes y después localmente a 1440 px y 375 px en claro y oscuro: Inicio para encabezados/paneles/filtros; Ventas, Clientes, Muestras, Productos y Papelera para listados; diálogos e importación para formularios. Revisar Producción, Máquina y login, más el tamaño intermedio de 768 px. Cubrir tablas con 0, 1 y una página completa de registros, textos largos y filtros sin resultados.
- Confirmar ausencia de desbordamiento horizontal de página, textos truncados indispensables y controles ocultos al reducir la ventana o hacer zoom al 200 %. Mantener scroll local solo donde la tabla lo requiera.
- Verificar contraste del texto normal de al menos 4,5:1 y foco perceptible. Probar Tab, Shift+Tab, Escape, confinamiento y retorno del foco, incluidos diálogos anidados; conservar las confirmaciones por cambios sin guardar.
- Comprobar errores y carga sin pérdida de valores ni desplazamientos bruscos. Verificar que guardar, cancelar, editar y archivar mantienen sus efectos actuales. Si se necesita persistencia, usar únicamente datos QA temporales en `dev/blackfruit` y limpiarlos al finalizar.
- Verificar modo oscuro en primera visita, recarga, navegación, cambios del sistema y entre pestañas, almacenamiento bloqueado y formularios modificados. Comprobar contraste en ambos temas, gráficos con datos, entorno del visor y ausencia de errores de hidratación atribuibles al tema. No declarar completo el modo oscuro solo porque funciona el selector.
- Ejecutar `npm run typecheck`, `npm run lint` y `npm run build`, más las comprobaciones existentes de navegador pertinentes. No agregar pruebas que solo repliquen clases CSS. Ejecutar el detector local de Impeccable sobre los archivos cambiados y revisar los hallazgos.
- Mantener capturas y datos privados fuera de Git, `public/` y servicios externos. Entregar referencias utilizadas, componentes y archivos afectados, evidencia local y pendientes reales; actualizar este plan y CHECKLOG solo con resultados efectivamente verificados.

### Resultado del 19/10/2026

Las entregas A, B y C están implementadas. Se conserva la marca y la organización del sidebar. Se usaron Impeccable, UI UX Pro Max y la guía de accesibilidad frontend de ECC. `next-themes` es la única dependencia nueva; no cambiaron el esquema ni las reglas de negocio.

| Entrega | Cambios y archivos principales |
| --- | --- |
| A. Base y listas | Tokens en `src/app/globals.css`; composición y tamaños en `brand.css` y `components.css`; Button/Input/Table/NativeSelect/Textarea; buscador, paginación y vacío compartidos. Toolbars de Ventas, Clientes, Productos y Papelera; tabs y filtros separados en Muestras. Listas de altura natural y vacíos sin paginación innecesaria. Período de Inicio con selector Mes/Rango/Histórico; mes de Producción con controles uniformes. |
| B. Formularios | `DialogFrame` unifica anchos, encabezado, cierre y capas; `FormField` y `FileField` ordenan campos y carga. Clientes, Productos, Ventas, Muestras e importación adoptan los controles; menos paneles dentro del diálogo y acciones accesibles al desplazar. Errores de Clientes/Productos asociados al campo y con foco en el mensaje. |
| C. Temas | `theme-provider.tsx`, `theme-picker.tsx` y layout: Claro/Oscuro/Sistema, persistencia local y sincronización entre pestañas. Login, tablas, formularios, estados, gráfico y entorno del visor usan colores del tema. El gráfico representa un único período con un punto, sin sugerir una caída inexistente. |

Verificación realizada:

- `npm run typecheck`, `npm run lint` y `npm run build`: correctos.
- `tests/ui-theme-browser.ts`: 40 combinaciones de pantalla/ancho/tema sin desbordamiento de página ni errores JavaScript; cuatro diálogos en ambos temas a 1440 y 375 px. Tab/Shift+Tab, Escape y retorno de foco; validación de cliente con valores conservados; filtro de ventas vacío; limpieza de búsqueda conserva estado; Muestras con 0, 1 y 31 registros QA, página siguiente y página posterior vacía. Ajuste adicional de Productos a 768 y 720 px.
- Tema: sistema claro/oscuro, preferencia explícita, recarga, navegación, sincronización entre pestañas, almacenamiento bloqueado y borrador abierto conservado. Se comprobó el visor 3D cargado en escritorio y su alternativa móvil.
- `tests/improvements-browser.ts`: alta y búsqueda de cliente, períodos automáticos, producto en diálogo anidado y registro de muestra en celular correctos.
- `tests/trash-browser.ts`: alta/edición de producto, archivo y reactivación, cliente enviado a papelera y restaurado, navegación y vista móvil correctos. Todos los registros QA se limpiaron al finalizar.
- Contraste de pares principales de tokens: texto ≥4,5:1 en ambos temas; borde de input claro ajustado y oscuro ≥3:1. Esto no sustituye una auditoría WCAG completa de cada combinación y estado.
- Detector local de Impeccable: sin hallazgos. Capturas antes en `tmp/ui-review/before/`; después y reporte en `tmp/ui-review/after/`. Son archivos locales ignorados por Git; no se publicaron.

Límites y siguiente revisión: 720 px verifica reflujo, no equivale a una prueba del zoom nativo del navegador al 200 %. Quedan el zoom nativo, lector de pantalla y Safari/iOS reales; no se instrumentó el primer pintado para certificar ausencia de un flash de tema. En importación se revisaron los formularios y controles, sin reconfirmar archivos reales. Antes de publicar, revisar esos casos y recorrer la revisión de importación con un archivo QA. No se hizo push, merge ni despliegue.
