# Producción, máquinas y deshidratador 3D v1

**Estado: desplegado en Vercel Production el 20/10/2026; migraciones verificadas en `dev/blackfruit`, en una rama aislada y en Neon `production`.** Pendiente de QA autenticado publicado y validación con medidas de la máquina real.

**Actualización — 12/10/2026:** el usuario confirmó dos opciones dentro de Producción: **Dashboard** y **Máquina**. La reorganización y la adaptación del diseño de una referencia visual local se verificaron con datos QA en `dev/blackfruit` y se desplegaron el 20/10/2026. Pendiente contrastar proporciones con la máquina física.

## Actor y resultado

Un administrador configura sus máquinas y registra una pasada después de terminarla. Puede recuperar el registro, corregirlo, comparar ciclos y consultar kilos por fecha real de finalización. El 3D y la tabla operan sobre los mismos datos.

## Decisiones confirmadas

- Se comienza con dos máquinas de 16 bandejas, creadas expresamente desde la interfaz. Se pueden agregar más desde esta versión; no hay límite de dos máquinas.
- Máquina: nombre, cantidad de bandejas, marca/modelo y observaciones opcionales. Sin ciclos se puede eliminar; con ciclos se archiva y se conserva su historial. Se puede reactivar.
- Una pasada ya terminó físicamente al registrarla. Estados del registro: borrador y finalizado. El borrador está fuera de indicadores.
- Cada ciclo conserva nombre y cantidad de bandejas de la máquina utilizada. La configuración posterior no reescribe su historia.
- Cada bandeja admite un producto/variante o está vacía.
- Peso individual: un resultado y una bandeja. Peso agrupado: un resultado y al menos dos bandejas del mismo producto y variante, del mismo ciclo. No se distribuye el peso entre bandejas.
- Kg exactos con hasta tres decimales, no negativos. Ausencia de peso significa pendiente; cero es un peso confirmado. Se suma cada resultado una sola vez.
- El Dashboard redondea los kilos a un máximo de dos decimales solo al mostrarlos, en resumen, historial y comparación. Los enteros aparecen sin decimales; se omiten ceros decimales finales. Las sumas, diferencias, registros y detalle conservan los tres decimales exactos; cada total se calcula antes de redondear.
- Finalizar exige fecha real, al menos una bandeja cargada y todos los resultados completos. Un total cero confirmado es válido.
- Corregir un finalizado conserva el último registro completo hasta guardar una corrección válida y atómica; no se convierte en borrador. Los cambios se auditan y controlan mediante versión.
- La fecha real de finalización es DATE; el instante de confirmación es TIMESTAMPTZ. Los reportes usan la primera.
- Producción ofrece dos opciones principales: **Dashboard**, para consultar resumen y tablas, y **Máquina**, para trabajar con el deshidratador y los ciclos. El nombre singular de la opción no limita la cantidad de máquinas registradas.

## Decisiones técnicas de esta versión

Las bandejas se numeran de arriba hacia abajo. El formulario acepta entre 1 y 128 bandejas por máquina. La identificación del ciclo es única. El catálogo registra cada combinación de producto y variante como un `Product`; el administrador puede agregar combinaciones y archivar las que ya no usa. Los ciclos conservan nombre y variante en sus resultados.

## Datos, arquitectura y permisos

ProductionMachine -> ProductionCycle -> ProductionTray; cada bandeja apunta como máximo a un ProductionResult del mismo ciclo. Product identifica una combinación del catálogo; bandejas/resultados conservan su descripción histórica. El servidor valida la composición y calcula totales; la base restringe FK, posiciones, estados y pesos.

`production:read/write` protegen vistas y acciones; `catalog:read/write` protegen catálogo. Las páginas autorizan y delegan a módulos. Creación y edición usan transacción, claves de envío y versiones; una edición concurrente no deja guardados parciales.

La ruta de uso es `/produccion`: resumen, historial y comparación. `/produccion/maquina` muestra la vista previa del equipo y permite elegir ciclos guardados. `/produccion/maquinas` administra deshidratadores, `/productos` administra el catálogo, `/produccion/nuevo` carga una pasada y `/produccion/[id]` muestra y corrige su detalle. Un ciclo finalizado solo ofrece guardar una corrección completa.

## Navegación y pantallas

Dentro de Producción hay una navegación visible **Dashboard | Máquina**, accesible también en celular. Dashboard es la entrada predeterminada. La configuración de equipos y el catálogo son acciones secundarias de estas vistas.

| Opción o entrada | Ruta | Contenido y comportamiento |
| --- | --- | --- |
| Dashboard | `/produccion` | Resumen de kilos, ciclos finalizados, desglose por producto y variante, tabla de ciclos y comparación. Acceso a registrar ciclo. |
| Máquina | `/produccion/maquina` | Selector de máquina, visor 3D del diseño, acceso a registrar una pasada y selector de ciclos guardados del equipo. |
| Registrar ciclo | `/produccion/nuevo?machine=<id>` | Editor compartido con el visor, equipo preseleccionado y bandejas inicialmente vacías. La opción Máquina queda activa. |
| Detalle de ciclo | `/produccion/[id]` | Mismo visor/editor con asignaciones, resultados y configuración histórica del ciclo. La opción Máquina queda activa. |
| Gestionar máquinas | `/produccion/maquinas` | Alta, edición, archivo, reactivación y eliminación cuando corresponda. Se accede desde Máquina. |

Las rutas reutilizan los enlaces existentes de creación y detalle. Los enlaces de navegación conservan los filtros del Dashboard al abrir una máquina o un ciclo y volver desde allí. La navegación indica la opción activa y admite teclado.

### Dashboard de producción

- Filtros de período mensual y máquina, con opción de consultar todos los períodos o equipos. Resumen, desglose e historial comparten esos filtros; el período usa la fecha real de finalización.
- Indicadores: kilos finales y cantidad de ciclos finalizados. Tabla de kilos por producto y variante.
- Historial paginado: identificación, fecha de finalización, estado, máquina, productos y kilos. Abrir un ciclo lleva a la vista Máquina con ese registro seleccionado.
- Cada ciclo finalizado o borrador ofrece «Enviar a papelera» desde su fila. La acción pide confirmación, comprueba la versión vigente y usa la papelera reversible; al completarse desaparece de las consultas operativas y puede restaurarse.
- Borradores en una sección aparte, fuera de los kilos y del conteo de finalizados. Se filtran por máquina; el filtro de finalización no oculta registros incompletos sin fecha.
- Comparación explícita de dos ciclos finalizados, con kilos por producto/variante, total de cada ciclo y diferencia. Los encabezados identifican también la máquina; se pueden comparar ciclos de equipos distintos.
- Las tablas y el resumen se pueden consultar sin cargar el motor 3D.

### Máquina y configuración del equipo

- Selector con nombre y cantidad de bandejas de cada máquina. Se parte de dos equipos de 16 bandejas, dados de alta por el administrador; se pueden agregar más.
- Sin máquinas: acceso a crear la primera. Con máquina y sin ciclo seleccionado: vista previa del equipo vacío, identificada como tal, con acciones para registrar una pasada o abrir un ciclo. Una vista previa no crea un registro de producción.
- La vista previa presenta el visor directamente bajo el selector de equipo y ciclo, sin una cabecera adicional con nombre, cantidad de bandejas o estado. El visor identifica la máquina y aclara que no hay ciclo. En celular, la alternativa de bandejas conserva la acción «Mostrar 3D».
- Al abrir un ciclo, su máquina, cantidad histórica de bandejas y resultados determinan lo mostrado. Cambiar la configuración actual de un equipo no altera ciclos anteriores.
- El panel **Bandeja** permite consultar/editar producto y variante, peso individual o grupo, navegar anterior/siguiente y seleccionar por número. Tabla y 3D comparten selección y estado de edición.
- El panel **Equipo** identifica la máquina y ofrece controles de visualización y acceso a gestionar su configuración. La cantidad de bandejas de un ciclo existente no se edita desde el visor.
- En un registro nuevo, cambiar de equipo con datos cargados requiere advertir qué asignaciones se descartan. Salir o cambiar de ciclo con cambios sin guardar requiere confirmación de descarte.
- Para un finalizado, se ofrece una corrección completa y atómica. Los cambios locales se identifican como pendientes de guardar; editar una bandeja no anuncia persistencia hasta guardar el ciclo correctamente.

### Flujo diario

1. Entrar a Producción y consultar Dashboard.
2. Ir a Máquina, elegir el deshidratador y seleccionar **Registrar ciclo** después de que termine la pasada física.
3. Indicar identificación y fecha real; cargar productos/variantes y pesos desde el panel o la tabla, agrupando bandejas cuando se pesaron juntas.
4. Guardar borrador si faltan resultados o confirmar el ciclo completo. Recargar conserva los datos guardados.
5. Volver al Dashboard para ver el resultado y compararlo. Abrir cualquier fila recupera el ciclo en la vista Máquina.

## Ejemplo ficticio

En la máquina «Principal» de 16 bandejas, el ciclo «P-001» termina el 11/10/2026. Las bandejas 1 y 2 llevan naranja con azúcar y se pesan juntas: **0,875 kg para el grupo**. La bandeja 3 lleva manzana y se pesa individualmente: **0,000 kg confirmado**. La bandeja 4 queda vacía; las demás pueden quedar vacías también. El total final es **0,875 kg**. No se asignan 0,4375 kg a cada bandeja del grupo.

## Interfaz 3D

Gabinete metálico, ventana, bisagra izquierda, controles superiores y bandejas configurables. Rotar, zoom, abrir/cerrar, restablecer cámara y seleccionar bandeja. La selección resalta la geometría y el panel compartido; un grupo muestra sus miembros y peso conjunto. Carga diferida del lienzo, controles HTML y tabla completa para celular/teclado/sin WebGL. La escena representa el registro, no una conexión física a la máquina.

### Adaptación de BlackFruit 3D v2

Referencia visual: [BlackFruit_3D_v2.html](../../designs/BlackFruit_3D_v2.html). El modelo incorpora gabinete de acero cepillado, ventana en puerta izquierda, rejillas, controles superiores, iluminación suave, fondo claro y frutas ilustrativas para los productos reconocidos. Productos nuevos tienen una representación genérica con etiqueta; la cantidad de fruta dibujada no representa un peso medido.

Controles actualizados el 12/10/2026: la barra principal contiene únicamente tres botones de icono: alejar, acercar y pantalla completa. Acercar la bandeja seleccionada es un icono contextual sobre el lienzo. Se retiran el selector de perspectiva y el botón de centrar; la cámara se gira arrastrando. «Piezas visibles» agrupa casillas para puerta, paredes, techo y panel trasero, además de puerta abierta, bandejas separadas y ver interior. «Ver interior» oculta pared derecha y techo; desmarcarlo vuelve a mostrarlos. Separar bandejas es una acción visual independiente de agrupar o separar pesajes.

El panel «Tu equipo» comienza oculto y se controla mediante la casilla «Mostrar tu equipo». La elección explícita se guarda como booleano en `localStorage` (`blackfruit:production:team-panel-visible`) y se recupera en próximas visitas al visor, tanto en vista previa como en ciclos. Seleccionar una bandeja no abre el panel automáticamente. Sin almacenamiento disponible, el control funciona durante la visita y comienza oculto en la siguiente. No se guardan datos del ciclo en esa preferencia ni se modifica la autorización en servidor.

Criterios observables de estos controles: los tres botones y el icono contextual tienen nombre accesible y área de 44×44 px; las casillas funcionan con teclado y reflejan la escena; ocultar la puerta deshabilita su apertura; mostrar/ocultar «Tu equipo» sobrevive a recarga y navegación; un valor ausente o inválido inicia oculto. Los controles se pueden usar a 375 px sin desbordamiento horizontal y los fallos de almacenamiento no interrumpen el visor.

Selección y ampliación, ajustadas el 12/10/2026: volver a tocar la bandeja seleccionada la deselecciona, elimina el resaltado y devuelve la cámara a la vista general de la máquina. Los botones numerados del panel permiten la misma acción; sin bandeja seleccionada el panel muestra «Todas las bandejas» y permite elegir una, sin inventar una bandeja activa. Al entrar en pantalla completa se amplía únicamente el lienzo de la máquina: no aparecen «Piezas visibles», cabecera, panel ni resumen. Zoom y salida de pantalla completa quedan sobre el lienzo; Escape también permite salir. Al salir, se recupera la página y el estado de selección.

La demo usa 12 bandejas, un máximo de 24, un catálogo fijo y kilos individuales en memoria. La integración utiliza la configuración y el catálogo guardados, el límite vigente de 128 bandejas y los resultados individuales o agrupados. El resumen del visor muestra kilos conocidos y pesajes pendientes; suma cada resultado una sola vez, incluido cero confirmado. El desglose distingue producto y variante.

La interfaz usa los componentes, tipografía, colores y autenticación de la app. El modelo se integra con Three.js y React Three Fiber existentes, con carga diferida y liberación de texturas y controles. En celular, el panel se ubica debajo del visor o como panel accesible en vista ampliada. Ante falta de WebGL o fallo de carga, la tabla y el formulario siguen disponibles.

## Integración del rediseño

Este cambio reutiliza máquinas, ciclos, bandejas y resultados existentes; no necesita migración de base de datos.

1. **Navegación y Dashboard:** `src/app/produccion/production-navigation.tsx`, `page.tsx` y `src/modules/production/infrastructure/prisma-cycles.ts` muestran filtros coherentes, tablas y borradores separados.
2. **Entrada Máquina:** `src/app/produccion/maquina/` permite elegir equipo y ciclo, y muestra una vista previa vacía. Las rutas de creación y detalle activan la opción Máquina.
3. **Modelo y controles:** `src/app/produccion/machine-canvas.tsx` adapta la escena y los controles v2 a la cantidad registrada de bandejas.
4. **Editor y guardado:** `src/app/produccion/cycle-editor.tsx` comparte selección, producto y peso entre panel, escena y tabla. Guardar usa las acciones y transacciones existentes; los controles de vista no alteran los resultados.
5. **Verificación:** pruebas de dominio e integración para sumas, filtros, borradores y comparación; recorrido Chrome para navegación, visor, selección 3D, cambios sin guardar y celular; `typecheck`, `lint` y `build`.

## Aceptación

- Crear dos máquinas, borrar una sin ciclos y agregar otra; recargar conserva los cambios.
- Archivar una máquina con ciclos conserva detalle, comparación y configuración histórica.
- Guardar/recargar un ciclo conserva todas las asignaciones y pesos.
- Dos bandejas con un resultado de 0,875 kg suman 0,875 kg. Rechazar solapamientos, mezclas, referencias cruzadas, negativos y exceso de precisión.
- Peso pendiente impide finalizar; 0,000 confirmado permite finalizar. Bandejas vacías no requieren peso.
- Corrección concurrente falla sin modificar líneas ni auditoría; reintentar creación no duplica.
- Comparación y resumen coinciden con resultados finalizados; fecha real determina el período. El Dashboard muestra enteros sin decimales y el resto con un máximo de dos, tras calcular cada total exacto.
- Enviar un ciclo finalizado o borrador a papelera desde el Dashboard lo retira de resumen e historial; restaurarlo recupera su estado y sus pesajes.
- Tabla y 3D seleccionan la misma bandeja; el recorrido funciona en celular y sin WebGL.
- Lectura y mutación sin permiso se rechazan en servidor.

### Aceptación del rediseño

- Producción ofrece Dashboard y Máquina; la opción activa es correcta en entrada, alta, detalle y configuración.
- Dashboard muestra resumen y tablas sin cargar 3D. Los filtros de máquina/período producen valores coherentes en kilos, desglose e historial, y los borradores quedan separados.
- Con dos máquinas de 16 bandejas se puede elegir cualquiera, registrar un ciclo y recuperarlo desde su fila del Dashboard; agregar otra máquina la incorpora al selector.
- La vista previa sin ciclo no inventa productos, kilos ni registros. Una máquina archivada sigue siendo visible en los ciclos históricos que la usaron.
- El modelo sigue la referencia v2 y muestra tantas bandejas como indique la configuración aplicable. Selección, panel, botones numerados y tabla permanecen sincronizados.
- Abrir puerta, girar la cámara, separar bandejas u ocultar piezas no modifica datos de producción. Se puede volver a mostrar cada pieza y salir de pantalla completa.
- Un peso agrupado se identifica como tal en panel, tabla y resumen; no se reparte ni se suma por cada bandeja. Pendiente y cero confirmado se distinguen.
- Guardar, recargar y reabrir desde Dashboard conserva asignaciones, grupos y pesos. Un error conserva la edición local y no muestra confirmación de guardado.
- Cambiar de ciclo/equipo o salir con cambios pendientes permite conservarlos o confirmar su descarte. Un ciclo histórico no cambia su cantidad de bandejas al configurar la máquina.
- En un ancho de 375 px los controles y panel son utilizables; la tabla admite desplazamiento dentro de su contenedor. Sin WebGL o con fallo de carga se puede completar el registro desde la tabla.

## Verificación del corte

Se comprobaron las reglas de máquinas y ciclos con pruebas de dominio; una prueba de integración creó y limpió datos QA en `dev/blackfruit` para comprobar persistencia, idempotencia, grupos, cero, finalización, filtros de máquina y período, borradores aparte, comparación, archivo y conflicto de versión. En Chrome se recorrió el alta de dos máquinas, eliminación de una sin ciclos, catálogo, ciclo agrupado, entrada Dashboard/Máquina, vista previa, controles 3D, selección desde el lienzo, navegación con filtros, aviso de cambios sin guardar y tabla móvil. Pasaron `typecheck`, `lint` y `build`.

## Límites

Sin stock, rendimiento, costos ni telemetría. Las dimensiones y proporciones exactas de la máquina siguen pendientes de medición; la geometría inicial representa la descripción proporcionada. La forma habitual de pesar en la operación real puede definirse después: la interfaz admite pesos individuales y agrupados.
