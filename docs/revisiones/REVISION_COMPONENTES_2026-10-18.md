# Componentes, layouts y modo oscuro: análisis previo

Fecha del diagnóstico: 18/10/2026. Este documento conserva el análisis previo. La implementación posterior, aprobada por el usuario, se completó localmente el 19/10/2026; ver [resultado y verificaciones](PLAN_MEJORAS_2026-10-18.md#resultado-del-19102026) y [especificación general de interfaz](../specs/frontend/001-interfaz-v1.md).

Este análisis amplía el [plan de mejoras](PLAN_MEJORAS_2026-10-18.md#corte-componentes-editoriales-y-premium). El usuario pidió revisar tablas, inputs, formularios, tamaños, filtros de fechas, buscadores, botones, estados vacíos y layouts, y agregar modo oscuro. La dirección confirmada sigue siendo editorial y premium, conservando BlackFruit.

## Evidencia y límites

Se revisaron los componentes UI, estilos globales, layout, filtros, formularios y listados de Inicio, Ventas, Clientes, Muestras, Productos, Producción, importación y Papelera. Se contrastaron con capturas locales anteriores a la implementación cancelada, a 1440 y 375 px, guardadas en `tmp/ui-review/before/`. Los archivos de interfaz restaurados no tienen diferencias de contenido frente a HEAD.

Se usaron las pautas locales de Impeccable para interfaces operativas y búsquedas de UI UX Pro Max sobre contraste, formularios y tablas vacías. El contexto de producto ya cargado en esta sesión mantiene la identidad existente. Su advertencia previa de esquema desactualizado de PRODUCT.md queda registrada; no se reparó ese archivo como efecto secundario.

El navegador de herramientas no pudo abrirse porque su perfil ya estaba ocupado. Por eso esta revisión **no acredita una nueva prueba interactiva**, ni contraste medido de todos los estados, ni un modo oscuro funcional. La evidencia visual es anterior y se verificó su correspondencia estructural con el código actual. Las capturas contienen información privada: no copiarlas al repositorio ni publicarlas. Los estados con datos, errores y diálogos anidados deberán verificarse nuevamente al implementar.

## Diagnóstico priorizado

P1: base necesaria o impacto visual alto y repetido. P2: mejora localizada o de segunda pasada. El esfuerzo es relativo y no representa una estimación de horas.

| Prioridad / esfuerzo | Pantalla o componente y evidencia | Problema e impacto | Propuesta |
| --- | --- | --- | --- |
| P1 / medio | Botones, `src/components/ui/button.tsx` | `default` mide 44 px, `sm` 28 px, `lg` 36 px e `icon` 32 px. La escala no es consistente; Editar/Archivar quedan diminutos frente a otras acciones. | Escala ordenada, tamaño táctil suficiente y variantes semánticas. Dar presencia a acciones secundarias mediante superficie tonal, borde y hover distinguibles. |
| P1 / medio | Inputs compartidos y campos escritos directamente en las páginas | Input declara 32 px y se corrige a 44 px desde CSS global; otros campos usan 40/44 px y fondos transparentes, crema o blancos. La densidad y el foco dependen del lugar. | Una base compartida para Input, NativeSelect y Textarea, alturas y tipografía explícitas y fondo de campo separado del panel. Eliminar la compensación global al migrar consumidores. |
| P1 / medio | Buscadores de Clientes, Ventas, Productos, Papelera y Contactos | Cada página compone su buscador. Algunos solo tienen etiqueta accesible oculta; los placeholders largos se cortan en móvil. En escritorio el buscador absorbe casi todo el ancho aunque la consulta sea corta. | SearchField con etiqueta visible breve, lupa decorativa, ayuda fuera del placeholder, limpieza accesible y ancho limitado en escritorio. Mantener búsqueda por envío/Enter en este corte. |
| P1 / medio | Inicio: `PeriodPicker`; Producción: filtro mensual | Inicio muestra tres selects sueltos; Producción usa un mes nativo de 40 px y botón de aplicar. El mes nativo depende del navegador. Los estados y tamaños parecen pertenecer a interfaces distintas. | Toolbar común y controles homogéneos. En Inicio, selector segmentado Mes/Rango/Histórico y mes/año alineados; conservar actualización automática. Producción conserva su envío explícito y capacidades actuales, con mes/año visualmente coherentes. |
| P1 / bajo | Muestras vacías, `src/app/muestras/page.tsx` y captura `muestras-1440.png` | Panel horizontal casi vacío, mensaje aislado y «Página 1» sin registros. «Revisar importadas» aparece en cabecera y navegación. Se apilan navegación y filtros con aspecto similar. | Un único acceso a revisión; distinguir navegación de filtros. Vacío compacto y accionable, sin paginación inútil. Con datos, tabla a ancho útil y altura natural. |
| P1 / medio | Tablas de Clientes, Productos, Muestras y Producción | Padding definido solo en parte de las columnas, estados con texto suelto, acciones y alineación numérica diferentes. La adaptación a tarjetas ocurre a distintos breakpoints sin un criterio compartido. | Primitivas de tabla y footer comunes, relleno consistente, cifras alineadas a la derecha, estado con texto y tono semántico. Elegir breakpoint según ancho de columnas, no imponer uno idéntico a todas. |
| P1 / medio | Formularios y diálogo de Muestras a 375 px | Paneles dentro del modal reducen el ancho disponible y añaden bordes/padding repetidos. Buscar contacto, seleccionar contacto y crear ocupan varias filas antes de llegar a los productos. | Secciones con títulos y separadores, sin paneles anidados en el modal; modo de presentación para página y diálogo. Mantener el selector actual en el primer corte, agrupando sus controles y usando ayudas breves. |
| P1 / medio | Diálogos de venta, muestra, cliente, producto e importación | Fondos, cabeceras, márgenes y alturas máximas se repiten con diferencias. Formularios largos esconden las acciones abajo. | Estructura compartida con tamaños por tarea, cabecera y acciones accesibles, scroll interno y capas para anidamiento. Mantener foco, Escape y protección de cambios. |
| P1 / alto | Modo oscuro: `globals.css`, layout raíz y `brand.css` | Existe `.dark`, pero no hay proveedor/selector. `--surface` no se redefine; paneles y selects usan blanco fijo. Activar solo la clase dejaría superficies claras con texto claro. | Completar tokens, migrar colores funcionales y conectar tema antes de dar el modo oscuro por terminado. |
| P2 / medio | Inicio y Producción vacíos | Inicio reserva 240–280 px por estado vacío; Producción apila resumen, ciclos y borradores vacíos con paginación. Mucho espacio visual sin siguiente acción. | Vacíos compactos por sección; conservar métricas y filtros. Borradores vacíos como sección breve. No llenar la pantalla con gráficos simulados ni estirar paneles a la altura del viewport. |
| P2 / bajo | Tipografía y layout general | Descripciones y datos auxiliares de 11–13 px, títulos y controles con jerarquías distintas. El contenedor general admite 1500 px, incluso cuando la tarea necesita poco espacio. | Escala tipográfica por rol, anchos por tipo de tarea y espaciado 4/8. Serif en títulos de página; sans en campos, tablas y controles. |
| P2 / medio | Importación de ventas y producción | Selectores de archivo, descarga de plantilla y presentación de pasos son diferentes; el nombre de archivo nativo se corta a 375 px. | FileField compartido con nombre legible, extensión/límite, acción reemplazar y feedback de lectura. Mantener revisión y confirmación explícitas. No ofrecer arrastrar archivos si no se implementa de verdad. |
| P1 / medio | Gráficos, estados y Máquina al cambiar tema | SalesChart usa colores hex fijos; badges y `--olive` necesitan pares de tema. Máquina usa fondos claros tanto en HTML como en el Canvas. | Tokens de gráficos, estados y visor. Adaptar fondo/etiquetas/controles del visor al tema conservando materiales, cámara, geometría y significado de los colores de bandejas. |
| P2 / bajo | Navegación móvil y toolbar | La navegación ocupa un bloque importante antes del contenido; añadir tema puede aumentar ese costo. | Mantener la organización del sidebar acordada. Poner el selector de tema en la barra superior existente y ajustar espaciado sin añadir otra fila de navegación. |

## Dirección visual y reglas concretas

La apariencia premium debe venir de proporciones, contraste, superficies y estados coherentes. Conservar naranja tostado como acción principal, crema y carbón como base, y oliva para estados apropiados. Los botones secundarios tendrán un relleno tonal perceptible; ghost queda para acciones de baja prioridad. Una selección activa se diferencia por texto/peso/indicador además del color. No colorear por igual acciones principales, filtros y acciones destructivas.

- **Tamaños:** controles estándar y botones con icono de 44 px; acción grande de 48 px. `sm` puede ser 36 px en escritorio y 44 px en dispositivos táctiles; no usar `xs` para acciones operativas. En las toolbars todos los controles alineados comparten altura. Tabla de 48–56 px por fila sencilla, creciendo con contenido real.
- **Tipografía:** título de página 32 px en escritorio y 28 px en móvil, serif existente; secciones 18–20 px sans; cuerpo/tablas 14 px; inputs 16 px en móvil; ayudas 12–14 px. Fechas, kilos e importes con cifras tabulares y formato vigente.
- **Espacio:** pasos de 4/8 px; gutters de página 32 px en escritorio y 16 px en móvil; secciones 24 px; campos relacionados 16 px; etiqueta–campo 8 px. Radios de controles 10 px, paneles 14 px y diálogos 16 px, definidos como tokens.
- **Anchos:** contenedor general máximo de 1440 px; listas y dashboards usan el ancho disponible. Formularios de página máximo 760 px; diálogos simples 560 px, ventas 672 px, muestras 768 px e importación 1024 px, siempre limitados al viewport menos 24 px. Buscadores de escritorio hasta 420 px, a ancho completo en móvil.
- **Muestras sin registros:** conservar cabecera y toolbar, reemplazar cuerpo y footer por un vacío con contenido de hasta 480 px y altura natural, padding 24 px. «Registrar muestra» cuando no hay registros; «Quitar filtros» cuando el filtro no devuelve resultados. No ocupar toda la altura de pantalla ni fabricar una tabla vacía. Con registros, usar todo el ancho útil.
- **Paginación:** ocultarla solo si página 1 no tiene siguiente página; conservar Anterior si se visita una página vacía posterior. Mostrar «Página N» sin inventar totales que el servidor no devuelve.
- **Movimiento:** feedback breve de color/opacidad, sin mover el layout de los controles; respetar reducción de movimiento. Sombras reservadas para overlays y elevación real.

## Modo oscuro propuesto

Esta capacidad amplía expresamente el plan anterior. Recomendación técnica: `next-themes` con atributo `class`, siguiendo la [integración oficial de shadcn para Next.js](https://ui.shadcn.com/docs/dark-mode/next). Es la única dependencia nueva propuesta; no instalarla durante el análisis. La [documentación de next-themes](https://github.com/pacocoursey/next-themes) cubre preferencia del sistema, persistencia y consideraciones de hidratación.

1. Opciones **Claro / Oscuro / Sistema**, valor inicial **Sistema**. Selector accesible en la barra superior, visible en móvil, y en el acceso/login para poder elegir antes de entrar. Guardar únicamente la preferencia visual en `localStorage` con clave `blackfruit-theme`, sin datos de negocio ni preferencias en base de datos.
2. Resolver el tema antes del primer pintado con el mecanismo del proveedor. El selector no debe generar markup distinto entre servidor y primer render cliente. Mantener un espacio de tamaño estable mientras se monta. Usar `suppressHydrationWarning` solo en el elemento raíz que el proveedor modifica, sin esconder errores del resto de la app.
3. Con Sistema activo, seguir cambios del sistema operativo; con Claro/Oscuro, respetar la elección explícita. Verificar recarga, navegación, sincronización entre pestañas y almacenamiento bloqueado; si no se puede guardar, la app debe seguir funcionando y el cambio puede durar solo la sesión de página.
4. Completar pares semánticos para fondo, superficie, superficie elevada, campo, texto, texto secundario, borde, acción principal/secundaria, foco, selección y estados success/warning/danger/info. Cubrir `--surface`, `--olive`, overlays, selección de texto, skip link, badges, gráficos y lienzo de producción. No usar una inversión CSS de colores.
5. Dirección de paleta oscura: carbón cálido para fondo, superficie ligeramente más clara, texto marfil, secundario arena, naranja más luminoso para acción y foco. Son criterios visuales; validar cada par de tokens con contraste antes de fijar valores definitivos. Mantener tabla, tooltip y formulario distinguibles del fondo.
6. La activación pública del selector se entrega cuando todas las pantallas compartidas estén adaptadas, incluyendo login, importación, Papelera y Máquina. La adaptación del visor afecta su entorno y etiquetas, no materiales ni reglas del modelo.

## Interacciones y límites de implementación

- No cambiar parámetros de consulta ni reglas de paginación. Buscar sigue funcionando con Enter/botón; el control de limpiar aplica la consulta vacía, conserva los demás filtros y vuelve a página 1. No agregar búsqueda automática general en este corte. El selector remoto de clientes conserva su búsqueda acotada existente.
- Inicio mantiene actualización automática y validación de rango. Un rango incompleto no dispara una consulta; la presentación debe indicar que falta completar el período y no hacer pasar los resultados anteriores por el rango incompleto. Producción mantiene mes e histórico, filtros por máquina y comparación; no se le agrega rango por analogía.
- Los controles de navegación siguen siendo enlaces con `aria-current`. El selector de modo de período usa radios nativos estilizados como segmentos; no declarar tabs si no hay un panel de pestañas correspondiente.
- Inputs, selects y textarea reutilizan estilos y semántica. FormField agrupa etiqueta, ayuda y error con IDs únicos. No reemplazar todos los selects por componentes custom ni añadir una biblioteca de tablas para un cambio visual.
- Shared Table/EmptyState/Pagination y DialogFrame solo componen presentación; cada módulo conserva columnas, consultas, validaciones y acciones. DialogFrame no absorbe reglas de formularios ni confirmaciones de descarte. No unificar z-index a un valor que rompa Producto dentro de Muestra/Venta.
- Los formularios conservan valores tras errores, nombres enviados, idempotencia, concurrencia y protecciones. Mantener fechas completas `dd/mm/yyyy`; mes/año no debe fingir un día. Cambiar tema no remonta ni borra formularios abiertos.

## Entregas y criterios de aceptación

| Entrega | Resultado visible | Dependencias y comprobación |
| --- | --- | --- |
| A. Base visual y listas | Tokens de ambos temas, escala de controles, botones, buscadores, toolbars, filtros de Inicio y Producción, tablas y vacío de Muestras. | Base compartida primero; revisar también Ventas, Clientes, Productos y Papelera. El selector oscuro aún no se declara terminado. |
| B. Formularios y diálogos | FormField, inputs/selects/textarea coherentes, secciones más legibles, diálogos sin paneles redundantes, file input uniforme. | Mantener reglas, capas y gestión del foco. Revisar desktop/móvil, formularios largos y error. |
| C. Modo oscuro completo | Proveedor y selector, persistencia y cobertura de gráficos, Máquina, importación, login y todas las superficies. | Solo cerrar el corte tras verificar ambos temas; revisar primer pintado e hidratación y conservar el formulario al alternar. |

La entrega A es la prioridad de impacto visible. B y C forman parte del alcance pedido; no dejarlas implícitamente fuera al terminar A. Antes de implementar, registrar el contrato de esta capacidad en `docs/specs/frontend/` siguiendo AGENTS.md y leer las guías locales de Next.js pertinentes.

Verificación de cada entrega: capturas locales antes/después a 1440 y 375 px, más revisión a 768 px y zoom 200 %; cero desbordamiento horizontal de página. Probar 0, 1 y una página completa de registros, textos largos, búsqueda sin coincidencias y página posterior vacía. No usar únicamente pantallas vacías para dar las tablas por verificadas.

Contraste: texto normal al menos 4,5:1; texto grande y componentes visuales significativos 3:1 cuando corresponda. Medir ambos temas. Teclado: Tab/Shift+Tab, radios, foco visible, Escape, retorno de foco y diálogos anidados. Estados: carga, error, éxito, deshabilitado, selección y cambios sin guardar. No ocultar los mensajes ni depender solo del color.

Pruebas de tema: primera visita con sistema claro/oscuro, cambio de preferencia, recarga, pestañas, almacenamiento no disponible y cambio de tema con un formulario modificado. Verificar gráficos con datos y tooltip/etiquetas del visor, además del DOM. Sin errores de hidratación atribuibles al tema.

Ejecutar typecheck, lint y build, y los recorridos existentes pertinentes. Usar datos QA temporales solo en `dev/blackfruit` cuando haga falta persistir; conservar la base real. No agregar tests que solo comprueben clases CSS. Ejecutar el detector local de Impeccable en los archivos de interfaz cambiados, corregir hallazgos relevantes y documentar limitaciones.

## Referencias y siguiente ejecución

- [Dashboard de shadcn/ui](https://ui.shadcn.com/examples/dashboard): composición de métricas, controles y tabla; adaptar su jerarquía a los datos existentes.
- [Bloques de dashboard de shadcn/ui](https://ui.shadcn.com/blocks?category=dashboard): vocabulario compartido de componentes y superficies; no copiar funcionalidades de la demo.
- [Studio Admin en Vercel](https://examples.vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard): referencia de layouts y opciones de tema; conservar la marca y la navegación acordadas de BlackFruit.

Modelo recomendado para ejecutar: **Astra con razonamiento alto**, por la necesidad de coordinar decisiones visuales, componentes compartidos y regresiones entre temas. Es una recomendación para este alcance, no una comparación medida de modelos. Ejecutar por las entregas A/B/C con evidencia visual y checks propios. Sol es una alternativa para ajustes puntuales posteriores, cuando las decisiones del sistema visual ya estén cerradas.

Durante el diagnóstico del 18/10 solo se actualizó documentación: no se ejecutaron build ni pruebas funcionales ni se cambió la app. La implementación y sus verificaciones del 19/10 se registran por separado en el resultado enlazado al comienzo de este documento.
