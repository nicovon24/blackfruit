# Plan de mejoras: clientes, muestras, producción y consultas

Fecha: 18/10/2026. Estado: propuesta de implementación; este documento no implica que las funciones estén terminadas.

## Resultado buscado

El administrador registra una persona una vez y la reutiliza en ventas y muestras; registra muestras sin salir de la pantalla; carga ciclos de producción desde Excel y consulta datos de ejemplo; cambia fechas y períodos sin un botón adicional; accede al historial completo con consultas acotadas y tiempos medidos.

La interfaz sigue Impeccable y UI UX Pro Max locales, en modo de uso operativo: conservar carbón, crema, blanco, naranja tostado, oliva y marca serif. Priorizar tareas, formularios claros, estados de carga y uso en escritorio/celular. El trabajo de ingeniería sigue SDD y las skills ECC correspondientes.

## Confirmado y pendiente

Confirmado por el usuario: agenda y reutilización de clientes; comprobar muestras y abrir su alta en un diálogo; importar producción desde Excel; cargar un ejemplo consultable; actualizar Inicio al cambiar fechas; consultar rangos de meses e histórico; definir caché, índices, paginación y mejoras de frontend; todas las fechas completas visibles y todos los campos de fecha usan `dd/mm/yyyy`.

Producción usa `ProductionCycle.finishedOn`, mostrado como «Fecha real de finalización». Confirmado por el usuario el 18/10/2026: usar esa fecha existente, hacerla visible y consistente en alta, edición, historial, dashboard e importación, en formato `dd/mm/yyyy`. No se incorpora fecha de inicio ni se requiere una migración por este ajuste.

Pendientes del importador: estructura de la planilla habitual, identificación de máquinas/productos, volumen esperado y tratamiento de códigos de ciclo existentes. El formato y la política sugeridos en este plan son propuestas que deben quedar resueltas en la especificación antes de implementar esa parte. Estas decisiones no bloquean fechas, clientes, muestras ni filtros.

## Estado observado

- `Customer`, la selección por ID y el alta junto con una venta/muestra existen. Falta `/clientes` y el selector descarga todos los contactos. No se reprodujo todavía el fallo de reutilización reportado.
- Muestras tiene dominio, transacciones y pantallas. Su alta navega a `/muestras/nueva`; seleccionar un contacto no completa el texto obligatorio de destinatario. Las tres pruebas actuales de dominio pasaron el 18/10; esto no verifica el recorrido autenticado ni la base conectada.
- Producción tiene máquinas, catálogo, ciclos, pesajes agrupados, resumen e historial paginado. El importador existente procesa ventas y muestras, no producción.
- Inicio acepta un mes y requiere «Ver». La serie diaria está construida para un solo mes; ampliar el rango exige adaptar consulta y gráfico.
- Ventas consulta las últimas 50 operaciones y filtra en el navegador. Producción y muestras usan paginación por desplazamiento. Hay índices existentes; su eficacia con volumen real todavía no fue medida.
- No se encontró caché explícita de consultas Prisma. Existen invalidaciones por ruta. `cacheComponents` no está habilitado.

## Entregas y dependencias

Cada corte incluye especificación, ruta completa, verificación de aceptación y actualización del estado. Respetar los cambios locales existentes y registrar una base de comparación antes de editar.

### 1. Fechas compartidas y línea base de rendimiento

- Inventariar fechas de alta/edición de ventas, ciclos, muestras, entrega, importaciones, revisiones, tablas, tarjetas y selectores. Corregir también lugares que hoy imprimen directamente `yyyy-mm-dd`.
- Crear un control compartido para escribir/pegar `dd/mm/yyyy`, con etiqueta visible, ejemplo de formato, teclado y error asociado al campo. Si incorpora calendario, debe compartir exactamente el mismo valor y funcionar con teclado y celular.
- No depender de la configuración regional del navegador para garantizar el orden de día y mes. Conservar fechas de negocio sin hora en `DATE` y usar `yyyy-mm-dd` internamente en contratos y URL; transformar solamente en los límites de entrada y presentación.
- Validar calendario real, años bisiestos, fechas incompletas y límites permitidos en servidor. No corregir silenciosamente `31/02/2026`. Mantener vacío lo desconocido y respetar los campos opcionales actuales.
- Mantener «hoy» según `America/Argentina/Buenos_Aires`. El cambio de formato no debe desplazar días ni reescribir fechas históricas.
- En producción, ubicar identificación, máquina y fecha antes de la carga de bandejas. Los indicadores usan la fecha real de finalización, según la decisión confirmada.
- Medir una línea base de Inicio, apertura de formularios, búsqueda e historial: duración de consultas, cantidad de filas transferidas y tiempo hasta mostrar contenido, distinguiendo primera carga y navegación posterior. No usar compilación de `next dev` como medida del rendimiento publicado.

Aceptación: `05/09/2026` conserva exactamente ese día tras guardar/recargar; campos vacíos opcionales permanecen vacíos; formato consistente aun con navegador en inglés; fecha imposible rechazada sin perder el resto del formulario.

### 2. Agenda de clientes y selección reutilizable

- Agregar Clientes a la navegación y `/clientes` con tabla en escritorio, presentación compacta en celular, búsqueda por nombre/teléfono/email y paginación del servidor.
- Permitir alta independiente y proponer edición de datos de contacto. Definir validación, concurrencia, auditoría y protección frente a reintentos para el alta independiente.
- Reutilizar la entidad `Customer` y sus relaciones actuales. No crear otra tabla de personas para muestras ni fusionar nombres automáticamente. Eliminación/fusión quedan fuera del primer corte.
- Sustituir la lista completa de opciones por búsqueda acotada, con espera breve al escribir, estado de carga, coincidencias distinguibles y recuperación por ID del cliente ya seleccionado aunque no esté en la página de resultados.
- Compartir selector entre venta, muestra e importación. Crear desde un formulario debe conservar sus datos y dejar seleccionado al nuevo cliente después del guardado que corresponda.
- Para muestras, proponer completar el destinatario a partir de la selección explícita cuando esté vacío, manteniéndolo editable. No sobrescribir un destinatario que el usuario ya escribió ni inferir un vínculo a partir del texto.
- Reproducir el problema reportado con crear → guardar → abrir otra operación → seleccionar → guardar → recargar; comprobar vínculo por ID y ausencia de duplicación.

Aceptación: crear una persona desde Clientes, reutilizarla en dos ventas y una muestra, recargar y conservar un solo cliente; distinguir homónimos; buscar personas fuera de la primera página; mantener controles de permisos en servidor.

### 3. Muestras en diálogo y comprobación completa

- Reutilizar `SampleForm` y `saveSample`; agregar modos de guardar/cancelar dentro de un diálogo. Abrirlo desde Muestras, Inicio, acceso Venta/Muestra y un cliente seleccionado.
- Guardar cierra el diálogo, confirma la operación y actualiza la lista conservando filtros y posición. Un error conserva destinatario, contacto, productos, cantidades y unidades.
- Proteger cambios sin guardar; impedir cierre accidental durante el envío; manejar Escape, foco inicial y retorno al disparador. Los controles deben seguir accesibles con teclado y pantallas pequeñas.
- Conservar las rutas de detalle y revisión para enlaces directos. El acceso habitual «Registrar muestra» abre el diálogo.
- Ejecutar integración y recorrido autenticado en la rama de desarrollo, previamente identificada: pendiente → recarga → edición → entregada; reintento; creación/reutilización de contacto; errores y permisos. Comparar métricas de ventas antes y después.

Aceptación: registrar desde Inicio sin navegar a otra vista; al reabrir, recuperar líneas y estado; la entrega actualiza el listado de contactos correspondiente; ingresos y cantidad de ventas permanecen iguales.

### 4. Períodos automáticos en Inicio y producción

- Crear un selector compartido con accesos a mes actual, mes anterior, rango de meses y todo el histórico. Para rangos personalizados, ofrecer Desde/Hasta en `dd/mm/yyyy`; las selecciones mensuales muestran mes/año y sus límites completos.
- Aplicar el cambio al completar una selección válida, sin «Ver» ni «Aplicar». No consultar con una fecha parcial o un rango invertido. Mostrar actualización pendiente sin borrar el contenido anterior.
- Mantener filtros en URL, soportar recarga y Atrás/Adelante, y asegurar que una respuesta antigua no reemplace la última selección. Cambiar el filtro reinicia la paginación.
- Hacer coincidir indicadores, desglose, gráfico y operaciones del período. Convertir el límite final inclusivo de la interfaz en un límite exclusivo en las consultas.
- Mes individual: gráfico diario. Rango de meses/histórico: gráfico mensual con eje mes/año. Definir una agregación más amplia si el histórico supera una cantidad legible de puntos; nunca transferir todas las operaciones para dibujarlo.
- Contar compradores distintos sobre todo el rango; no sumar conteos mensuales. Calcular el ticket con total/cantidad del rango. En producción sumar cada pesaje agrupado una sola vez y mantener borradores fuera de los kilos.

Aceptación: cambiar octubre por septiembre actualiza sin botón; septiembre–octubre incluye ambos meses completos; el histórico incluye registros anteriores; repetir cliente en varios meses cuenta una persona; filtros sobreviven a recarga y vuelta desde un detalle.

### 5. Ejemplo persistente de producción en desarrollo

- Verificar que el destino sea una rama Neon distinta de `production` antes de escribir. Preparar una carga explícita con IDs o claves estables que pueda repetirse sin duplicación y retirarse por sus propios identificadores.
- Propuesta de conjunto ficticio: dos ciclos finalizados en septiembre/octubre, uno con pesaje agrupado y otro individual, más un borrador. Ejemplo de totales esperados: septiembre 1,250 kg, octubre 1,750 kg, histórico 3,000 kg; borrador fuera de los indicadores.
- Usar máquinas y productos de ejemplo identificables. Guardar mediante las mismas reglas de dominio; no fabricar bandejas ni repartir kilos agrupados.
- Verificar dashboard, rango de fechas, comparación y reapertura en Máquina. Mantener el ejemplo disponible para que el usuario explore, separado de los datos QA que las pruebas limpian.

Aceptación: los totales coinciden con el conjunto publicado, la recarga conserva ciclos y una segunda ejecución no agrega registros. Este corte puede adelantarse cuando estén definidos fecha y destino, sin esperar al importador.

### 6. Importación Excel/CSV de producción

- Incorporar «Importar producción», plantilla descargable y pasos cargar → mapear → revisar → confirmar → resultado. Reutilizar lectura y límites técnicos del importador existente, con reglas de producción propias.
- Plantilla propuesta: código de ciclo, fecha de finalización, máquina, producto/variante, bandejas del pesaje, kilos y observaciones. Una fila representa un pesaje; una lista de bandejas representa un grupo cuyo peso se suma una sola vez. La vista previa resuelve máquinas/productos a IDs mediante selección explícita ante ambigüedad.
- Mostrar fechas como `dd/mm/yyyy` y generar la plantilla con ese formato. Aceptar fechas tipadas de Excel y formatos de entrada documentados; rechazar valores ambiguos/no válidos conservando origen y fila.
- Validar fecha, máquina, posiciones únicas y dentro de rango, coherencia de datos entre filas de un mismo ciclo, producto/variante del grupo, decimales y datos necesarios para finalizar. No inferir bandejas reales si una planilla solo tiene totales por producto: ese formato requiere una decisión de modelo aparte.
- Conservar lote, hoja, filas, firma del contenido y vínculos al ciclo. Propuesta de duplicados: mismo origen y contenido ya confirmado se omite; cambios sobre un ciclo existente se muestran como conflicto y no lo sobrescriben automáticamente.
- Confirmar cada ciclo de forma atómica. Para lotes grandes, permitir progreso persistido y reanudación con resultado por ciclo; documentar si la primera versión limita el tamaño o necesita trabajo en segundo plano. No aumentar el límite actual sin medir memoria y duración.
- Revalidar resumen, historial y selector de ciclos tras confirmar. Preparar migración aditiva de procedencia y lote según la especificación aprobada.

Aceptación: importar dos ciclos con varios pesajes; ver kilos y fechas correctos; reimportar sin duplicar; aislar un ciclo inválido; detectar contenido cambiado; recuperar el resultado de un envío interrumpido sin registros parciales.

### 7. Consultas, índices, caché y frontend

- Ventas: búsqueda y filtros del historial completo en servidor con páginas acotadas, incluyendo papelera. Añadir orden estable con ID para desempatar. No confundir el límite de una página con todo el historial.
- Clientes: búsqueda limitada y paginación desde el primer corte. Producción/muestras: conservar las páginas actuales y evaluar cursores si los desplazamientos profundos resultan costosos; preservar filtros y selección.
- Reemplazar la transferencia de todos los compradores distintos por un conteo agregado en PostgreSQL. Revisar consultas secuenciales evitables y seleccionar solo los datos necesarios.
- Comparar planes con `EXPLAIN (ANALYZE, BUFFERS)` en desarrollo con volumen representativo. Evaluar índices para filtros y orden de ventas, fecha/estado/máquina de ciclos, fecha/estado/contacto de muestras y búsqueda de clientes. Los índices existentes son el punto de partida; no añadir todos los candidatos sin evidencia.
- Estrategia inicial de caché: resúmenes agregados por rango y máquina, y catálogo/equipos si la medición lo justifica. Claves incluyen filtros normalizados y alcance de acceso; autorización antes de leer caché. Conservar detalle editable y consultas de escritura frescos.
- Invalidez después del commit: venta creada/editada/anulada/restaurada/importada invalida resumen de ventas; ciclo creado/corregido/importado invalida producción; catálogo/equipos/clientes invalidan sus consumidores. Corregir una fecha debe invalidar tanto períodos anteriores como nuevos y rangos/histórico afectados.
- Definir caducidad corta como respaldo, lectura actualizada después de guardar y actualización entre las dos sesiones autorizadas. Cubrir caché del servidor y datos ya presentes en el navegador. Cerrar sesión descarta datos privados del cliente; no persistirlos en `localStorage` ni cachear sesión/permisos como datos de negocio.
- Elegir la API de caché según las guías de la versión instalada de Next y el despliegue. La configuración actual no activa Cache Components; evaluar caché selectiva antes de cambiar el modelo global. Una caché en memoria de una instancia no garantiza coherencia entre instancias.
- Frontend: carga diferida del contenido de diálogos/importador/3D, búsquedas con espera breve y descarte de respuestas obsoletas, mensajes de carga/error, gráficos agregados y listas acotadas. Medir antes de introducir virtualización o memoización adicional.

Aceptación: búsqueda encuentra operaciones antiguas; páginas sin duplicados por empates; después de guardar se ven los nuevos totales; una sesión sin permiso no obtiene datos cacheados; documentar comparación antes/después con entorno y volumen. No prometer una mejora numérica sin medición.

## Especificaciones y archivos afectados

Antes de implementar, ampliar o crear specs con actor, resultado, reglas, estados, datos, permisos, errores y criterios observables:

| Capacidad | Especificación prevista | Superficie de implementación |
| --- | --- | --- |
| Fechas y períodos | Nueva especificación frontend, siguiente número disponible | Campo/formateador compartidos, formularios, Inicio, producción, importador y gráficos |
| Agenda y reutilización | Ampliar backend/004 o crear capacidad de agenda enlazada | Nuevo `/clientes`, módulo customers, selector compartido, navegación |
| Muestras en diálogo | Actualizar backend/007 y frontend/002 | `sample-form`, acciones, nuevo diálogo y sus disparadores |
| Ejemplo e importación de producción | Ampliar backend/006 y crear spec de importación de producción | Módulos production/imports, rutas de carga/revisión, plantilla, Prisma |
| Rendimiento y caché | Nueva especificación técnica en db, enlazada a criterios de cada capacidad | Consultas Prisma/SQL, invalidación, paginación y medición |
| Migraciones | Documento en migrations por cambio necesario | Procedencia de producción, posibles índices y cualquier campo confirmado |

No duplicar reglas contradictorias entre el plan y las especificaciones: el plan organiza entregas y las specs fijan los contratos definitivos.

## Cierre de cada corte y publicación

- Pruebas de dominio/integración para fechas, identidad, duplicación, agregación de rangos, muestras separadas e importación atómica; recorrido real para selector de clientes y diálogo. Generar solo las pruebas que cubren estos riesgos.
- Ejecutar `npm run typecheck`, `npm run lint` y `npm run build` al cerrar cada corte funcional.
- Revisar escritorio/celular y teclado con Impeccable y UI UX Pro Max; capturas de los flujos cambiados, una ronda conjunta de correcciones y confirmación acotada. Ejecutar el detector manual de Impeccable sobre los archivos UI modificados al finalizar.
- Aplicar y probar migraciones exclusivamente en desarrollo. Para publicación, documentar orden, compatibilidad con la versión anterior, recuperación y condiciones de reversión. Mantener migraciones aditivas cuando sea posible; no eliminar ciclos importados como mecanismo automático de rollback.
- Revisar secretos, datos ficticios y datos reales antes de cualquier publicación. La ejecución del plan no implica desplegar a producción ni confirmar una planilla real sin revisión.

## Orden recomendado

Fechas y medición inicial → Clientes → Muestras → Períodos → Ejemplo de producción → Importación de producción → Optimización medida. La paginación de clientes se entrega junto con la agenda; la corrección de consultas detectada en cada capacidad se incluye en su corte, sin posponerla artificialmente al último.

El próximo pase con Astra puede revisar primero los pendientes de negocio, la cobertura de aceptación y la estrategia de caché. La implementación comienza por el primer corte con reglas suficientes, conservando el avance del resto del repositorio.
