# Interfaz de gestión v1

## Actor y resultado

El equipo autorizado de BlackFruit consulta sus resultados y registra ventas desde escritorio o celular. La interfaz de la app sigue una referencia visual privada, sus tokens y el HTML local, con un login de la misma identidad.

## Alcance y reglas

- Componentes reutilizables en `components/ui`, `layout` y `shared`; las páginas mantienen la autorización y delegan las lecturas a los módulos.
- Menú carbón, lienzo crema, superficies blancas, acentos naranja y oliva. Serif solo en la marca; cifras tabulares y controles de al menos 44 px.
- Navegación con rutas implementadas, estado activo y acceso por teclado; navegación compacta en celular.
- Login con email/contraseña, visibilidad opcional, envío pendiente y errores accesibles. Sin registro público. Recuperación por correo pendiente de proveedor.
- Dashboard mensual con cuatro indicadores, evolución diaria y operaciones recientes del mismo período. Solo ventas confirmadas y no borradas contribuyen a los indicadores y al gráfico. No usar valores de la maqueta como datos reales.
- Ventas con búsqueda y filtro sobre las últimas 50 operaciones, alcance visible; tabla en escritorio y tarjetas en celular. Anulación y papelera requieren confirmación y mantienen sus reglas actuales.
- Fotos originales, catálogo y vistas independientes de muestras/clientes conservan el alcance del plan. Importación y selección/creación de clientes ya cuentan con sus propias especificaciones e implementación.
- Nueva venta y detalle/edición se abren en diálogos desde dashboard/listado. Se mantienen rutas directas alternativas; cancelar o guardar regresa al contexto del listado. Importación conserva su recorrido dedicado de tres pasos.
- Importar se abre como diálogo desde la acción «Importar Excel» del dashboard; deja de ser un destino del menú lateral. El diálogo conserva carga, mapeo, revisión, confirmación e historial de resultados. Cerrar durante una tarea en curso se bloquea; cerrar una revisión sin confirmar pide descartar el trabajo local. La ruta `/importar` sigue protegida para acceso directo. El cierre de sesión se muestra dentro del sidebar, también en su versión compacta para celular.

## Estados y errores

Vacío inicial, período sin ventas, búsqueda sin resultados, sesión inválida, credenciales incorrectas, guardado pendiente, conflicto de edición y confirmación/cancelación de acciones. La base sigue siendo la fuente persistente.

## Aceptación

- [x] Login y navegación con controles nativos enfocables, contraseña visible opcional y error de credenciales. Probados Tab entre campos y Escape en confirmación; auditoría de accesibilidad completa pendiente.
- [x] Capturas de escritorio y celular, sin desbordamiento a 375 px. También comprobados listado a 768 px y login a 320 px.
- [x] Crear, recargar, editar, anular, enviar a papelera y restaurar una venta.
- [x] Al cancelar con Escape la confirmación de anulación, la ventana de detalle permanece abierta para poder decidir de nuevo.
- [x] Dashboard con datos reales y coherencia de período en gráfico y recientes.
- [x] Typecheck, lint, build y pruebas de integración sin regresiones.
- [x] Desde dashboard, «Importar Excel» abre un diálogo Radix con foco contenido, cierre por Escape/X y contenido desplazable a 375 px; el menú lateral no contiene Importar.
- [x] Cerrar tras cargar/revisar un archivo solicita confirmar descarte; durante carga/revisión/confirmación no cierra. Confirmar actualiza el dashboard y permite ver historial sin salir.
- [x] «Salir» está en el sidebar en escritorio y celular, no en la barra superior; cierra sesión y vuelve a login.

## Evidencia de QA

### Refinamiento del 3 de octubre de 2026

Actor: equipo autorizado que registra y consulta ventas, especialmente desde celular. Se conserva la identidad carbón/crema/naranja/oliva, los permisos de servidor, los datos históricos y las reglas de negocio.

- Alta: fecha e importe preceden al cliente opcional. Alta y edición asocian errores con su campo y enfocan el campo rechazado tras responder el servidor; conservan valores escritos.
- Diálogo: cerrar con cambios mediante X, Escape, clic exterior o Cancelar requiere aceptar descartarlos. Rechazar mantiene el formulario. Se bloquea el cierre mientras el formulario guarda. Esta protección no es un borrador persistente y no cubre recargar/cerrar la pestaña.
- Un fallo al cargar la venta ofrece Reintentar dentro del diálogo. El aviso de guardado tiene cierre de 44 px.
- Ventas: el alcance de las últimas 50 operaciones se muestra antes del buscador, con Limpiar filtros cuando corresponda. Se buscan también importes formateados como ARS y nombres sin distinguir tildes. No se amplía la consulta histórica.
- Las tarjetas móviles distinguen cliente de nombre de origen sin vincular, muestran canal y permiten envolver nombres largos.
- Dashboard: Total vendido aclara que el indicador es un importe. En celular, recientes aparece antes del análisis; las ayudas de métricas usan 12 px y el estado vacío de productos se compacta.

Criterios observables: rechazar descarte conserva importe; aceptar cierra; cancelar sin cambios no pregunta; el campo inválido tiene foco y descripción; buscar un importe tal como aparece en pantalla encuentra la operación; limpiar restaura resultados; a 375 px no hay desbordamiento y recientes precede al gráfico. La persistencia y los totales continúan en los servicios existentes.

Pendientes del estudio: simplificar importación por pasos y filtros de revisión, búsqueda paginada de todo el historial y revisión visual completa del login. Ver `docs/REVISION_UI_2026-10-03.md`.

`tests/browser-journey.ts` recorre Chrome con una cuenta y una venta temporales en `dev/blackfruit`, limpia los datos al terminar y guarda capturas en `tmp/qa-*.png`. Verifica errores de JavaScript y consola, salvo la respuesta 401 esperada del caso de contraseña incorrecta. Las capturas conservan el cursor para no modificar atributos del DOM durante la hidratación. `tests/auth-integration.ts` verifica indicadores, gráfico, filtro de período, permisos y auditoría.

El recorrido del 3/10 abre Importar desde el dashboard, rechaza un descarte y conserva la revisión, confirma un CSV QA, reabre el historial y cierra sesión desde el sidebar. `typecheck`, `lint`, `build` y `test:browser` pasaron; el detector Impeccable sobre la UI modificada devolvió cero hallazgos. Las capturas de escritorio y celular verifican el nuevo lugar de Salir y la ventana de importación.
