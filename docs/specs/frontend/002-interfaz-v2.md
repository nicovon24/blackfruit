# Interfaz v2 — Plan integral de BlackFruit

Estado: **implementación parcial en la rama `feature/produccion-muestras-3d`**. Fecha: 12/10/2026. Plan integral y registro de lo entregado en este mismo documento.
Modo de superficie: Operate. Autoridad visual: interfaz existente y referencia visual privada mantenida fuera del repositorio. Revisión: [diagnóstico](../../revisiones/REVISION_UI_2026-10-12.md).

## Actor, resultado y decisiones

El equipo autorizado registra una pasada que ya terminó, consulta su producción y gestiona muestras desde escritorio o celular. Debe reconocer equipo/ciclo, editar bandejas, registrar pesos y guardar sin perder contexto.

**Confirmado:** Máquina es la primera entrada de Producción; Dashboard es la segunda opción. Máquinas configurables, inicialmente dos de 16 bandejas. Las secciones siguientes conservan el objetivo completo; el estado real de cada corte se precisa más abajo.

## Pantallas y flujo diario

1. Abrir Producción → Máquina; elegir equipo. Mostrar último ciclo seleccionado o vista previa explícita «Sin ciclo seleccionado», nunca una carga real supuesta.
2. «Registrar ciclo» abre una pasada terminada: identificación y fecha de finalización, asignación de producto/variante por bandeja, resultados individuales o agrupados. Observaciones plegables.
3. Guardar borrador si falta información o guardar registro finalizado cuando todos los resultados estén completos. Mostrar identificación y confirmación de persistencia.
4. Consultar ciclos guardados en lectura. «Editar registro» habilita corrección explícita; guardar o cancelar conserva el contexto del equipo. Mantener control de concurrencia existente.
5. Dashboard permite filtrar por equipo/período, ver kilos/productos/ciclos, consultar historial y comparar dos pasadas. Borradores aparte.

### Composición de Máquina

Escritorio: una cabecera compacta (máquina, ciclo, fecha y estado); debajo visor amplio y panel de edición contiguo. Selector `3D | Bandejas` comparte selección y datos, sin repetir todo el formulario simultáneamente. Pie persistente con kilos registrados, resultados pendientes, estado de cambios y acciones. Gestión de máquinas y catálogo como acciones secundarias.

El panel muestra número de bandeja, producto/variante y peso individual, o nombre del grupo, sus miembros y su único peso conjunto. Selección múltiple disponible también en HTML; asignar producto a varias bandejas y agrupar requiere las mismas reglas que la edición individual. Colores acompañados por etiquetas: vacía, cargada pendiente, resultado individual y grupo. El resaltado seleccionado no oculta el estado.

Controles principales del modelo, ajustados por pedido del usuario el 12/10/2026: únicamente pantalla completa y zoom (+/−), todos como iconos. Acercar bandeja queda como icono contextual. Se retiran selector de perspectiva y restablecer cámara; puerta abierta, bandejas separadas, interior y piezas se controlan con casillas dentro de «Piezas visibles». «Tu equipo» empieza oculto; «Mostrar tu equipo» guarda su preferencia en el navegador para las próximas visitas. Seleccionar una bandeja conserva esa elección. Mantener acero, puerta izquierda, ventana, bandejas y controles superiores de la referencia. No añadir temperaturas, tiempos ni actividad simulada.

La selección puede quedar vacía: tocar de nuevo la bandeja activa muestra la máquina completa y quita su resaltado. Pantalla completa muestra solo el modelo, con zoom y salida como controles superpuestos; «Piezas visibles» y el panel quedan fuera de esa vista.

Celular: vista inicial de bandejas en lista/tarjetas; 3D opcional y cargado a demanda. Selección, producto y peso próximos; barra de acciones respeta teclado y área segura. Todas las operaciones de datos funcionan sin WebGL. Tablet adapta visor/panel a espacio real; no impone un lienzo alto antes de los campos.

### Rutas y contexto

| Ruta | Propuesta |
| --- | --- |
| `/produccion/maquina` | Entrada desde menú global; primera pestaña Máquina |
| `/produccion` | Conservar Dashboard y sus enlaces existentes; segunda pestaña |
| `/produccion/nuevo` | Registrar con máquina seleccionada; mismo espacio de trabajo |
| `/produccion/[id]` | Lectura del ciclo y edición explícita |
| `/produccion/maquinas` | Gestión secundaria de equipos |
| `/productos` | Catálogo; alta contextual reutiliza su caso de uso y conserva borrador |

El estado activo de Producción se calcula por el prefijo `/produccion`, separado del destino del enlace. Conservar filtros, equipo, paginación y selección al volver. Validar parámetros de retorno con lista permitida, como hace `production-links.ts`. Selector de ciclos recientes acotado y acceso al historial completo; evitar cargar todas las opciones.

## Seguridad de edición, datos y errores

- Estados de UI: nuevo sin guardar, guardado, cambios sin guardar, guardando y error. Ningún alta virgen dice «Datos guardados». Son estados de interfaz, no nuevos estados del ciclo.
- Cambiar un producto por el mismo valor es una operación nula. Cambios sobre bandejas vacías no afectan resultados ajenos.
- Antes de modificar grupos con pesos, calcular y mostrar todos los resultados/bandejas afectados. Cancelar conserva exactamente los datos; confirmar invalida únicamente los resultados que ya no representan sus miembros. Ofrecer deshacer local de la transformación.
- Si se retira parte de un grupo pesado, su peso no puede atribuirse automáticamente a los miembros restantes. Requiere revisión explícita; nunca inventar distribución ni sumar pesos anteriores para fabricar otro resultado.
- Diferenciar pendiente (`null`) de cero confirmado. No sumar peso grupal por cada miembro. Pesos exactos de hasta tres decimales; cálculos autoritativos en servidor.
- Proteger cambios al cambiar máquina/ciclo, alternar Venta/Muestra, navegar o cerrar; comprobar atrás/adelante del navegador. No introducir autosave persistente silencioso.
- Error general cerca de guardar, mensajes asociados a campo/grupo, foco al primer error y valores conservados. Reintento seguro y conflicto de edición explicado sin sobrescritura silenciosa.
- Autorización actual en servidor para toda lectura/escritura. La alternativa HTML y el 3D consumen el mismo estado y caso de uso.

No se anticipa cambio de esquema para este rediseño. Reutilizar máquinas, instantánea histórica de bandejas del ciclo, resultados y vínculos, catálogo/variantes, muestras/líneas y procedencia existentes. Las consultas nuevas pertenecen a módulos; cualquier necesidad posterior de esquema requiere especificación y migración separada en Neon de desarrollo.

### Ejemplo ficticio verificable

Máquina A, ciclo C-101, 16 bandejas, finalización 12/10/2026:

| Bandejas | Producto y variante | Resultado |
| --- | --- | --- |
| 1–4 | Naranja sin azúcar | Grupo G1: 1,250 kg en conjunto |
| 5 | Manzana natural | Individual: 0,300 kg |
| 6 | Banana natural | Individual: 0,000 kg confirmado |
| 7–16 | Vacías | Sin resultado requerido |

Total **1,550 kg**; ninguna bandeja de G1 muestra un peso individual inventado. Si banana pasa a pendiente, se puede guardar borrador pero no finalizar. Comparar con C-102 de 2,000 kg muestra ambos totales y cada producto/variante; no reparte diferencias entre bandejas. El período se determina por finalización, no por fecha de carga.

## Dashboard de Producción

Resumen compacto, filtros compartidos, historial legible y comparación sencilla por producto/variante y total. Comparar requiere dos ciclos distintos y válidos; explicar selección incompleta o inválida. Mostrar ausencia de producto de forma inequívoca, sin confundirla con pesaje pendiente. Mantener alcance de los filtros visible. Tarjetas móviles con fecha, máquina, estado, productos y total; abrir detalle recupera el ciclo correcto.

## Muestras

Separar tareas: Registro, Contactos sin entrega y Revisar importadas. En Registro, filtro Todas/Pendientes/Entregadas. Formulario: destinatario y fecha, productos/variantes, cantidad/unidad, estado, contacto opcional y observaciones. Priorizar catálogo; entrada manual como alternativa explícita. Mantener entidades y reglas separadas de ventas.

Desde un contacto identificado, «Registrar muestra» puede precargar su ID, sin vincular por texto. Distinguir «No hay contactos», «No hay coincidencias» y «Todos tienen entrega vinculada». Acotar/paginar listas según consulta.

Las importadas conservan origen y revisión. «Por revisar» describe calidad de datos, no un estado de entrega. No convertir desconocido en pendiente/entregada por defecto inadvertido. Conversión idempotente, revisión explícita de campos obligatorios y de identidad; ninguna nueva muestra suma ingresos ni ventas. No sumar cantidades con unidades distintas.

## Consistencia general

Conservar carbón/crema/naranja/oliva, tipografía y componentes actuales. Unificar tokens del visor, densidad, foco, mensajes, vacíos y acciones; reducir cabeceras/bordes anidados. Objetivo táctil del proyecto: 44×44 CSS px o área equivalente de control, con separación clara.

Propuesta de navegación móvil: Inicio, Ventas, Producción y Muestras; Papelera como acción secundaria accesible desde Ventas. El resumen actual de ingresos se titula «Resumen de ventas»; no atribuirle un resumen completo del negocio. Añadir accesos a tareas existentes sin mezclar indicadores.

Ventas conserva sus mejoras previas y añade protección al cambio Venta/Muestra. Muestras reutiliza selectores, líneas cuando corresponda, feedback y guardas. Login recibe solo ajustes de legibilidad si la inspección confirma necesidad; recuperación por correo sigue siendo capacidad independiente.

Importación: conservar etapas, procedencia e idempotencia; revisar con filtros de errores, ventas, muestras y exclusiones, y resumen separado antes de confirmar. Textos y botón deben representar ambos tipos de operación. La búsqueda completa del historial de ventas queda como corte futuro explícito.

## Plan detallado para el resto de la aplicación

Estas secciones amplían la propuesta general anterior. La inspección adicional se basa en rutas, componentes y especificaciones actuales; no implica una nueva validación visual autenticada. Producción conserva prioridad, y cada módulo se entrega por separado.

### 1. Navegación y estructura compartida

**Resultado:** reconocer dónde estoy, encontrar la acción principal y volver al contexto anterior.

- Menú principal: Inicio (`/dashboard`), Ventas, Producción (entra en Máquina) y Muestras. Catálogo accesible mediante una opción secundaria persistente; Papelera dentro de Ventas; gestión de máquinas dentro de Producción. Salir conserva una ubicación identificable en el menú.
- Escritorio: mantener sidebar y ancho útil; una cabecera por pantalla con título, descripción breve si aporta y una acción principal. Tablet/celular: navegación compacta con etiquetas legibles y contenido que no quede detrás del menú.
- Diferenciar navegación, filtros y acciones. Los enlaces de retorno conservan filtros permitidos; las acciones de guardar no parecen enlaces de navegación.
- Crear patrones compartidos solo cuando haya usos concretos: cabecera, filtros, estado vacío, feedback de guardado, fila/tarjeta de registro y protección de salida. Reutilizar componentes existentes antes de crear variantes.
- Carga: espacio estable y mensaje accesible; vacío: explicar si faltan registros o si el filtro no encuentra resultados; error: conservar contexto y ofrecer recuperación. Nunca mostrar cero como sustituto de una consulta fallida.
- Números tabulares, ARS con formato local, fechas legibles y cantidades con unidad. Estado representado por texto y color. Sin introducir tipografías, temas ni librerías nuevas como requisito del rediseño.

**Aceptación:** navegación activa correcta en detalle/alta/papelera; teclado y foco visibles; sin destinos ficticios; acciones accesibles a 375 px y con zoom 200 %; abrir y cerrar un diálogo devuelve el foco al disparador.

### 2. Inicio y resumen de ventas — `/dashboard`

**Resultado:** entender las ventas del período y entrar rápido a una tarea habitual.

**Composición:** título «Resumen de ventas», período y acción «Nueva operación» con elección explícita Venta/Muestra. Importar como acción secundaria. Conservar los cuatro indicadores actuales, gráfico diario y operaciones recientes. Añadir accesos discretos a Registrar ciclo y Muestras, sin mezclar kilos con importes.

**Flujo:** elegir período → consultar indicadores → abrir operación reciente → editar/guardar → volver al mismo período con datos actualizados. En celular, mantener las operaciones recientes antes del análisis extenso, aprovechando la solución existente.

**Estados y reglas:** distinguir mes sin ventas de ventas sin detalle de productos. El gráfico y los indicadores usan el mismo período. El bloque de productos declara su cobertura y unidad; revisar las unidades de las líneas antes de mantener la etiqueta universal «u.». Si conviven unidades incompatibles, separarlas y no sumar ni comparar sus cantidades como una sola magnitud.

**Archivos:** `src/app/dashboard/page.tsx`, `sales-chart.tsx`, `sales-list.tsx`, consultas de `modules/sales`, layout compartido.

**Aceptación:** solo ventas confirmadas y fuera de papelera aportan a los indicadores; una venta de varias líneas cuenta una vez; muestras excluidas; guardado actualiza el período correcto; los estados sin datos no parecen errores; gráfico con resumen textual comprensible sin depender del hover.

### 3. Ventas: listado, alta y detalle — `/ventas`

**Resultado:** registrar una venta breve, encontrarla y corregirla sin perder la posición del listado.

**Listado:** cabecera con Nueva operación, búsqueda y filtro de estado; Importar y Papelera secundarios. Conservar tabla en escritorio y tarjetas en celular, priorizando fecha, importe, cliente opcional y estado. Mantener visible que la búsqueda actual cubre las últimas 50 operaciones. No prometer «todas las ventas» sin implementar la consulta completa.

**Alta:** elegir Venta/Muestra antes de completar campos. Para venta por importe: fecha e importe primero, cliente opcional después; canal y notas secundarios. Conservar creación contextual de cliente. Guardado pendiente visible y doble envío bloqueado; éxito cierra el diálogo y actualiza el listado sin perder filtros.

**Detalle:** resumen de fecha, total y estado; datos opcionales y procedencia en secciones secundarias. Mantener apertura en diálogo y rutas directas accesibles. Separar visualmente guardar, anular y enviar a papelera. Una venta importada con líneas muestra su detalle histórico y deja claro qué campos pueden editarse actualmente.

**Protecciones:** cambiar Venta/Muestra con datos ingresados pasa por la misma guarda de descarte que cerrar. Cancelar conserva campos y foco; confirmar cambia de formulario sin convertir entidades silenciosamente. Conflicto de versión informa y permite revisar los datos actuales, sin sobreescribir automáticamente.

**Archivos:** `src/app/ventas/page.tsx`, `nueva/sale-form.tsx`, `[id]/edit-sale-form.tsx`, `components/shared/sale-dialog.tsx`, `sales-list.tsx`, `customer-picker.tsx` y módulo sales.

**Aceptación:** crear sin cliente y recargar; editar y conservar filtros; cancelar un cambio de tipo conserva todo; no duplicar por doble clic; importadas conservan líneas/precios/descripciones; confirmar anulación cambia indicadores; acciones rechazan sesión o versión inválida.

**Cortes futuros separados:** alta/edición manual por líneas e historial completo con búsqueda/paginación en servidor. El rediseño deja lugares coherentes para estas capacidades, pero no las presenta como implementadas.

### 4. Papelera — `/ventas/papelera`

**Resultado:** reconocer una venta eliminada y decidir restaurarla o borrarla definitivamente.

- Mantener retorno a Ventas. Cada tarjeta muestra fecha, importe, cliente cuando exista y estado previo para distinguir operaciones similares.
- Restaurar es la acción principal del registro; eliminación definitiva queda separada con tratamiento destructivo. Su confirmación identifica la venta y explica que no se podrá restaurar.
- Tras restaurar, quitar la tarjeta, confirmar resultado y ofrecer abrir la venta. Conservar su estado previo: una venta anulada restaurada no pasa a confirmada.
- Conflicto: informar que el registro cambió y permitir actualizar. Papelera vacía: explicar su finalidad y volver a Ventas.

**Archivos:** `src/app/ventas/papelera/page.tsx`, `[id]/actions.ts`, `confirm-sale-action.tsx` y consultas de sales.

**Aceptación:** cancelar borrado no modifica datos; eliminación definitiva solo desde papelera y con versión válida; conservar auditoría y tratamiento de procedencia definido en ventas v1; restaurar no altera líneas ni cliente. Sin acciones masivas nuevas en este corte.

### 5. Importación — diálogo y `/importar`

**Resultado:** saber qué se importará, corregir problemas y confirmar una sola vez.

**Paso 1, archivo:** indicar formatos admitidos y requisitos reales; archivo seleccionado, progreso y errores concretos. Mantener datos privados fuera de mensajes técnicos y consola.

**Paso 2, columnas:** vista previa y mapeo con obligatorios identificados; ejemplo de cada columna. Mantener el trabajo al volver al paso anterior. Evitar una pantalla que obligue a recorrer todos los campos para detectar un error básico.

**Paso 3, revisión:** resumen separado de ventas, muestras, filas por revisar, excluidas y posibles duplicados según el detector de importación existente. Filtros para concentrarse en cada grupo; detalle editable de la fila seleccionada. Hacer visible el alcance de la vista previa y permitir llegar a toda fila que requiera revisión mediante consulta acotada o paginación.

**Confirmación y resultado:** botón y resumen nombran ambos tipos de operación. Explicar cuáles se guardan y cuáles permanecen pendientes/excluidas según las reglas actuales; no introducir descartes silenciosos. Tras confirmar, mostrar cantidades efectivamente creadas, omitidas o pendientes y enlaces al historial/revisión. Durante la confirmación, impedir doble envío y cierre que interrumpa el flujo.

En celular, tarjetas de filas y editor enfocado en una fila; conservar encabezado de etapa, progreso y acción. Evitar una matriz completa de campos comprimidos.

**Archivos:** `src/app/importar/import-wizard.tsx`, `editor-actions.ts`, `components/shared/import-dialog.tsx`, módulo imports. Alinear `../backend/003-importacion-papelera-v1.md` al implementar.

**Aceptación:** cambiar una fila entre Venta/Muestra respeta sus campos y reglas; un nombre no vincula automáticamente contactos; repetir confirmación no duplica; ningún dato desconocido se presenta como entrega confirmada; volver de un error conserva mapeo y correcciones; resumen final corresponde a lo persistido, sin contabilizar muestras como ventas.

### 6. Muestras: registro, contactos y revisión

**Registro (`/muestras`):** cabecera con Nueva muestra; estados Todas/Pendientes/Entregadas, búsqueda y fecha cuando las consultas los soporten. Cada registro muestra destinatario, fecha, estado y resumen de productos/cantidades; unidades siempre visibles. Tarjetas móviles con acción de abrir detalle.

**Alta/detalle (`/muestras/nueva`, `/muestras/[id]`):** destinatario y fecha, selección de catálogo y líneas, estado y notas. Contacto opcional claramente diferenciado del texto de destinatario. Campos de entrega aplican según las reglas existentes; no completar fechas históricas desconocidas automáticamente. Guardado, errores y protección de salida siguen el patrón compartido.

**Contactos sin entrega:** pestaña del módulo, con búsqueda y consulta acotada; distinguir quienes tienen muestras pendientes de quienes no tienen registros vinculados. «Registrar muestra» abre alta con el ID elegido. La ausencia de entrega vinculada no demuestra que nunca haya existido una entrega fuera del sistema.

**Revisión (`/muestras/revision`, `/muestras/revision/[id]`):** lista de pendientes con origen y campos faltantes; detalle muestra fuente conservada y datos revisados separados. Guardar/converter usando el caso de uso actual, sin deducir identidad ni estado por nombre. Indicar cuándo la fila ya fue incorporada y permitir abrir el registro asociado.

**Archivos:** rutas de muestras, `sample-form.tsx`, `customer-picker.tsx`, módulos samples/imports. Conservar la semántica de `../backend/005-muestras-v1.md`.

**Aceptación:** muestra pendiente se encuentra tras recargar; marcar entregada explícitamente actualiza las consultas correctas; error mantiene líneas; contactos homónimos se distinguen por datos disponibles; origen se conserva y conversión repetida no duplica; la pantalla diferencia cero contactos de todos con entrega y de búsqueda sin coincidencias.

### 7. Contactos: selección y alta contextual

**Resultado:** elegir a la persona correcta o crearla dentro de la tarea que se está completando.

Conservar el selector compartido: buscar, mostrar datos de contacto disponibles, seleccionar por ID, crear con nombre obligatorio y teléfono/email opcionales. Coincidencias de nombre advierten y permiten distinguir; no fusionan. «Sin cliente» sigue siendo válido en Ventas. Quitar un vínculo afecta únicamente esa operación.

Crear desde una venta mantiene la transacción y protección contra duplicados existentes. En Muestras, respetar su propio caso de uso y permisos; no asumir que la transacción de Ventas puede reutilizarse sin adaptación. Al cancelar creación, conservar la operación principal.

**Archivos:** `components/shared/customer-picker.tsx`, casos de uso de customers/sales/samples. Reglas de la venta: `../backend/002-ventas-v1.md`; agenda y edición de contactos: `../backend/006-agenda-clientes-catalogo-v1.md`.

**Aceptación:** dos contactos con mismo nombre permanecen independientes; reintento no crea contactos extra; crear/quitar vínculo conserva fecha, importes o líneas del formulario. El alta y la edición independiente de la agenda se rigen por `../backend/006-agenda-clientes-catalogo-v1.md`; fusionar contactos sigue fuera del alcance.

### 8. Productos y variantes — `/productos`

**Resultado:** encontrar una combinación existente, agregar otra y dejar de ofrecer las que ya no se usan.

- Cabecera con Agregar producto; listado como contenido principal, formulario de alta en sección desplegable o diálogo. Producto, variante, unidad y estado legibles; filtro Activos/Archivados/Todos y búsqueda acotada según consulta.
- Tarjetas móviles evitan depender de la tabla ancha. Separar producto y variante sin ocultar unidad; no añadir precios ni stock inexistentes a este flujo.
- Archivar/reactivar con feedback y explicación de su efecto en futuras selecciones. No borrar referencias históricas ni impedir la lectura de ciclos o muestras ya guardados.
- Alta contextual desde ciclo/muestra reutiliza validación y permisos del catálogo; volver al formulario con la nueva opción disponible y el resto del borrador intacto. Conservar también la ruta independiente.

**Archivos:** `src/app/productos/page.tsx`, `product-form.tsx`, `actions.ts`, módulo catalog y selectores consumidores.

**Aceptación:** alta → selección en formulario → guardar → recargar conserva el producto correcto; archivar no modifica registros anteriores; reactivar recupera la opción; errores y coincidencias siguen reglas actuales del catálogo, sin inventar fusiones o normalizaciones destructivas.

### 9. Administración de máquinas — `/produccion/maquinas`

**Resultado:** agregar equipos y configurar nombre/cantidad de bandejas con sus consecuencias claras.

Listado de máquinas con estado y capacidad; Agregar máquina como acción principal. Editar configuración en formulario breve, separando cambios para futuras pasadas de la configuración histórica de ciclos existentes. Volver a Máquina conserva el equipo elegido si sigue disponible.

Equipos sin uso pueden eliminarse según reglas del dominio; equipos con historial se archivan. Mostrar el motivo cuando una acción no corresponde, y confirmar el impacto concreto antes de eliminar. Sin crear automáticamente dos equipos de demostración en la base real.

**Archivos:** `src/app/produccion/maquinas/*`, módulo production y selector de equipos.

**Aceptación:** agregar dos equipos de 16 y luego otro con diferente capacidad; selector refleja persistencia; eliminar uno sin uso no afecta al otro; archivar uno usado conserva acceso a sus ciclos; cambiar capacidad no reescribe bandejas históricas.

### 10. Acceso y estados de aplicación

**Login (`/login`):** conservar la composición actual y revisar legibilidad del texto auxiliar; email/contraseña, mostrar contraseña y envío claros. Permitir pegado y gestores de contraseñas; errores comprensibles sin revelar existencia de cuentas. Sin enlaces a registro o recuperación que todavía no funcionan.

**Acceso denegado (`/acceso-denegado`):** explicar falta de permiso sin datos privados; retorno al ingreso y posibilidad de cerrar/cambiar sesión usando autenticación existente si corresponde. Evitar que el usuario quede repitiendo el mismo acceso sin salida clara.

**Carga/error/no encontrado:** durante cada corte revisar rutas directas, IDs inexistentes y fallos de consulta; usar estados consistentes con retorno seguro y reintento cuando tenga sentido. Un fallo de datos no debe disfrazarse de una lista vacía. Revalidar sesión en servidor, también en acciones.

**Archivos:** `src/app/login/*`, `acceso-denegado/page.tsx`, layout y límites de error/carga de las rutas que lo necesiten, módulo auth. No cambiar políticas ni crear cuentas durante el trabajo de UI.

**Aceptación:** login accesible a 375 px y por teclado; estado de envío anunciado; sin contenido privado antes de autorización; acceso directo y sesión vencida se resuelven coherentemente; reintentar error de consulta no duplica mutaciones.

## Entregas pequeñas y dependencias

| Corte | Trabajo y archivos principales | Salida comprobable |
| --- | --- | --- |
| 1. Edición segura | `cycle-editor.tsx`, dominio de producción y pruebas focalizadas | Estados veraces; cambios de grupo parcial con aviso, cancelación y deshacer; no-op preserva pesos; guardar/recargar exacto |
| 2. Entrada y consulta Máquina | `app-navigation.tsx`, `production-navigation.tsx`, `maquina/page.tsx`, `machine-preview.tsx`, lecturas de producción | Máquina primero, contexto conservado, selección acotada, vista previa explícita y detalle inicialmente en lectura |
| 3. Registro centrado en máquina | Editor, `machine-canvas.tsx`, escena 3D y componentes compartidos | Visor/panel/acciones próximos; vista HTML equivalente, móvil a demanda, selección y agrupación sincronizadas; ruta completa hasta lectura persistida |
| 4. Consulta de producción | `produccion/page.tsx`, `production-links.ts`, consultas y comparación | Historial móvil, filtros persistentes, comparación válida y kilos por finalización |
| 5. Muestras | `muestras/page.tsx`, `sample-form.tsx`, módulo samples y `sale-dialog.tsx` | Tres tareas diferenciadas, alta desde contacto, revisión importada, guardas y métricas separadas |
| 6a. Estructura compartida | layout/shared/ui, `brand.css`, `globals.css` | Navegación global, cabeceras, feedback y estados; validar en las pantallas ya reorganizadas |
| 6b. Inicio y Ventas | dashboard, listado/formularios de ventas y componentes compartidos | Período y contexto conservados, Venta/Muestra protegido, métricas coherentes |
| 6c. Papelera y contactos contextuales | papelera, confirmaciones y `customer-picker.tsx` | Restauración/borrado claros, selección por ID y formularios preservados |
| 6d. Catálogo y equipos | productos, máquinas y sus módulos | Gestión accesible, alta contextual, archivo sin alterar historial |
| 6e. Acceso y recuperación de errores | login, acceso denegado y límites de error/carga | Legibilidad, teclado y rutas privadas verificadas, sin nuevos flujos de autenticación |
| 7. Importación | `import-wizard.tsx`, módulo imports y especificación | Revisión por tipo/error, totales separados y confirmación idempotente |

Cada corte actualiza la especificación afectada, recorre entrada → caso de uso → persistencia → lectura cuando corresponde y se verifica antes del siguiente. No hacer un reemplazo total de componentes ni agregar librerías visuales sin necesidad demostrada.

### Avance implementado en esta rama

| Corte | Estado al 12/10/2026 | Evidencia o límite |
| --- | --- | --- |
| 1. Edición segura | Implementado | Regla pura `reconfigure-trays.ts`: avisa resultados medidos afectados, conserva grupos ajenos, no-op al repetir producto, deshacer local; cuatro pruebas nuevas y recorrido QA |
| 2. Entrada Máquina | Implementado | Menú y pestañas Máquina primero; ciclos recientes limitados a 20 con enlace al historial; detalle finalizado abre en lectura |
| 3. Registro centrado en máquina | Parcial | Máquina primero, panel y agrupación disponibles junto al 3D; tabla alternativa, lista móvil compacta, guardado visible, alta contextual del catálogo; sin WebGL o tras perder el contexto sigue la vista de bandejas, con selección por teclado verificada; render 3D a demanda; falta medir rendimiento y auditar lector |
| 4. Dashboard de producción | Parcial | Tarjetas móviles, comparación estrecha, aviso de ciclos inválidos y paginación que conserva selección; opciones recientes acotadas a 100 y selección de ciclos históricos desde filas, resumen agregado en la base con decimales exactos; falta comprobar rendimiento con gran volumen real |
| 5. Muestras | Parcial | Registro/contactos/revisión separados, tarjetas móviles, contactos y revisiones paginados, alta desde ID, estado importado explícito, catálogo prioritario y protección de salida con Atrás comprobada; recorrido de revisión importada en navegador con conversión explícita y procedencia conservada |
| 6a–6e. Resto de la app | Parcial | Navegación móvil de cuatro destinos, Papelera desde Ventas, Inicio rotulado según sus métricas, cantidades por producto y unidad, catálogo móvil buscable y paginado, edición de máquinas plegable, guardas de Atrás en Ventas, Catálogo y equipos, login más legible; faltan búsqueda global de ventas y auditoría visual/teclado de todas las pantallas |
| 7. Importación | Parcial | Textos para ventas y muestras, filtro de revisión por tipo/error/duplicado, edición de una fila desplegada por vez, guarda de Atrás en ruta directa y recorrido autenticado; falta evaluar lotes grandes y accesibilidad de la revisión |

Los cambios de esta iteración no agregan estados de negocio ni migraciones. Las pruebas de integración en `dev/blackfruit` verificaron persistencia de producción y muestras; una prueba adicional confirma que kg y paquetes de un mismo producto se agrupan por separado en el resumen de ventas. El navegador QA creó datos temporales y los limpió: recorrió máquina, catálogo, ciclo grupal, selección 3D, pérdida de WebGL, bandejas móviles, alta de muestra, guardas de navegación, el flujo de importación y la revisión histórica con estado explícito. Capturas en `tmp/qa-production-3d-v2.png`, `tmp/qa-production-mobile-v2.png`, `tmp/qa-production-tablet-v2.png` y `tmp/qa-sample-review-mobile.png` (directorio ignorado por Git).

Pendiente para cerrar la especificación completa: auditoría completa con teclado y lector, medición con zoom 200 %, rendimiento de ciclos/comparación e importación con gran volumen real, y decisiones abiertas del final. Las guardas de enlace, recarga y Atrás en los formularios principales están implementadas; el recorrido QA cubre Atrás y enlaces, pero falta probar Adelante en todos los flujos. A 768 px el recorrido de producción no desbordó; aún falta evaluar ergonomía con teclado. La búsqueda de todo el historial de Ventas y el alta manual de líneas permanecen en sus capacidades propias.

Los cortes 6a–6e desglosan la consistencia global en entregas revisables. Extraer durante 1–5 únicamente los patrones compartidos necesarios para esos flujos; 6a consolida su aplicación al resto. 7 reutiliza los patrones de formularios y contactos anteriores. No condicionar el cierre de Producción a terminar toda la app.

## Verificación transversal del plan integral

Por cada pantalla modificada, registrar evidencia nueva a 375×812, 768×1024 y 1440×900, con sesión autorizada y datos de prueba. Comprobar contenido largo, lista vacía, filtro sin coincidencias, carga, error y uso por teclado. No confundir ausencia de overflow con facilidad de uso.

Recorridos mínimos de cierre: login → nueva venta → editar → anular → papelera → restaurar; muestra pendiente → entrega explícita → contacto actualizado; importación mixta → revisión → confirmación → reintento sin duplicados; catálogo → alta contextual → operación guardada; equipo → ciclo → consulta → comparación. Comparar indicadores antes/después para confirmar separación de ventas, muestras y producción.

Conservar los checks técnicos definidos por AGENTS.md en cada corte funcional. Para cambios solo visuales, priorizar inspección de la pantalla y regresiones relevantes; añadir pruebas de dominio/integración cuando cambien transformaciones, consultas o persistencia. No se ejecutan migraciones ni se modifican datos reales como parte de esta planificación.

## Criterios de aceptación

- [x] Abrir Producción lleva a Máquina y marca el módulo activo en sus rutas; Dashboard sigue accesible.
- [ ] En escritorio 1440×900 se ve máquina y panel juntos, con acción de guardado accesible sin bajar al final de una tabla. A 375×812 y 768×1024 la tarea funciona sin desborde de página ni campos ocultos por barra/teclado.
- [x] Seleccionar bandeja en 3D resalta la misma en HTML/panel y viceversa. Cambiar de vista conserva datos y selección; cargar otro ciclo muestra sus datos guardados.
- [x] Sin WebGL, con pérdida de contexto o con 3D aún sin cargar, siguen disponibles todas las operaciones de datos. Cámara/puerta no modifican resultados; el recorrido QA consultó el ciclo guardado después de usar esos controles.
- [ ] Cantidad configurable funciona con 16 y con el máximo permitido por el dominio (128 pasó prueba de dominio); archivar equipo usado conservó el ciclo en integración. Falta prueba visual de 128 bandejas.
- [ ] Agrupar/separar/cambiar producto afecta solo los resultados anunciados. Cancelar o deshacer recupera pesos exactos; probar especialmente selección parcial de un grupo pesado y elección del mismo producto.
- [x] El ejemplo exacto de 1,550 kg pasó prueba de dominio con 16 bandejas; cero, pendiente y suma única pasaron pruebas de dominio e integración. La recarga en navegador se comprobó con otro ciclo agrupado.
- [ ] Resúmenes y comparación excluyen borradores y usan finalización. Dos ciclos iguales muestran explicación; volver conserva filtros y selección.
- [ ] Salir con cambios de ciclo/muestra/venta advierte antes de perderlos; error de red conserva entradas y permite reintento seguro.
- [ ] Muestras no alteran ingresos ni conteo de ventas; repetir conversión importada no duplica; desconocidos e identidad requieren revisión explícita.
- [ ] Recorrido por teclado, foco visible/no oculto, errores anunciados y asociados; medir contraste, zoom 200 % y controles táctiles. Completar tabs o usar controles nativos sin semántica incompleta.
- [ ] Movimiento reducido se respeta también en animaciones JavaScript del 3D; la carga diferida y el render a demanda están implementados. Verificar gestos de scroll y medir cuadros en reposo en un dispositivo representativo antes de afirmar rendimiento.
- [ ] En cada corte funcional: pruebas de dominio/integración para el riesgo cambiado, `npm run typecheck`, `npm run lint`, `npm run build`; revisión visual autenticada de escritorio/celular. No reutilizar resultados antiguos como evidencia nueva.

## Decisiones todavía abiertas

- Dimensiones y distribución exacta de la máquina: mantener geometría configurable de la referencia hasta tener medidas.
- Frecuencia de pesaje individual/agrupado: soportar ambos con igual precisión, sin inferir un predeterminado por negocio.
- Identificación automática de ciclos: conservar ingreso manual existente en esta propuesta.
- Validar con uso real si lectura inicial y edición explícita reducen correcciones involuntarias; es propuesta, no decisión previamente confirmada.
- Unidades y fechas desconocidas de muestras históricas: conservar pendientes de revisión, según especificación de importación; no resolver con supuestos de UI.

Fuera de alcance: stock, costos, rendimiento, telemetría, control físico, nuevos permisos, rediseño del esquema, app nativa y recuperación de cuenta. Estas capacidades requieren cortes propios.
