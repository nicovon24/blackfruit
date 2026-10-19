# Plan de implementación de BlackFruit

El desarrollo sigue especificación, implementación de una ruta completa y verificación. Los criterios observables están en `docs/specs/`.

## Corte de mejoras de uso y escala: 18/10/2026

El [registro único del plan y su resultado](revisiones/PLAN_MEJORAS_2026-10-18.md) cubre formato `dd/mm/yyyy`, agenda de clientes, alta de muestras en diálogo, períodos automáticos, importación XLSX de producción y consultas acotadas. Implementado y verificado en `dev/blackfruit`; pendiente de despliegue. La caché persistente sigue condicionada a mediciones.

## Corte en curso: clientes, productos y papelera reversible

Ver [especificación de clientes, catálogo y papelera](specs/backend/010-papelera-catalogo-v1.md). Clientes tiene alta por diálogo; Productos, acceso propio en el menú, alta y edición por diálogo; la papelera reúne ventas, clientes, ciclos y muestras con restauración. La navegación se organiza por tareas según la [especificación del sidebar](specs/frontend/004-navegacion-sidebar-v1.md). La limpieza física de ejemplos queda en un script restringido a desarrollo, con vista previa por defecto. Los tres ciclos, dos productos y la máquina DEMO se eliminaron de `dev/blackfruit` el 18/10/2026. La acción de borrado físico anterior de ventas se retiró. Migración aplicada en `dev/blackfruit`; pendiente de despliegue y de ensayo completo de restauración del entorno.

Ensayo en `dev/blackfruit`: se crearon 26 clientes desde los nombres distintos de ventas importadas y se vincularon 32 ventas sin cliente. Se preservaron las filas de procedencia; no hubo coincidencias previas ni ventas en papelera. Reporte y ejecución protegida están en `scripts/preview-sales-customer-backfill.ts` y `scripts/backfill-sales-customers-dev.ts`. `production` no fue consultada ni modificada; requiere reporte y aprobación de mapeo propios antes de una ejecución.

| Corte | Estado | Resultado |
| --- | --- | --- |
| Preparación | Completado | Next.js, Prisma, Better Auth y rama de desarrollo de Neon. |
| Acceso privado | Parcial | Login, cierre, permiso admin y lista de dos correos comprobados; falta recuperación por correo. |
| Ventas | Parcial | Ventas por importe, estados, auditoría, dashboard y clientes en el flujo de ventas; faltan líneas manuales. El catálogo de productos y variantes ya se administra en la rama de producción. |
| Importación | Implementado | XLSX/CSV, revisión, muestras, exclusiones, procedencia e idempotencia. El archivo real se confirma únicamente por decisión del administrador dentro de la app. |
| Producción | Implementado en rama | Máquinas configurables, catálogo, ciclos, pesajes individuales y agrupados, 3D, tabla, historial, comparación y resumen. Migraciones probadas en `dev/blackfruit`; pendiente de despliegue. |
| Producción: Dashboard y Máquina | Implementado en rama | Dos opciones dentro de Producción. Dashboard reúne resumen y tablas; Máquina integra el diseño v2, selector de equipo/ciclo, visor y editor compartido. Verificado con QA en `dev/blackfruit`; pendiente de despliegue. |
| Muestras | Implementado en rama | Registro separado de ventas, contactos sin entrega, importación con revisión de datos incompletos y preparación de filas históricas. Migración probada en `dev/blackfruit`; pendiente de despliegue. |
| Uso cotidiano | Pendiente | Exportación de consulta, restauración ensayada, recuperación de cuenta y QA final. |
| Interfaz v2: Máquina primero | Parcial en rama | Entrada por Máquina, edición segura de pesajes, composición móvil y mejoras de Dashboard, Muestras, Ventas, Catálogo e Importación. Ver avance y pendientes en interfaz v2. |

La app calcula totales con decimales exactos y conserva precios y descripciones históricos. Las muestras no son ventas. Una venta puede carecer de cliente; el nombre del archivo de origen no identifica a una persona por sí solo.

## Corte: Producción con Dashboard y Máquina

Decisión confirmada el 12/10/2026. Dentro de Producción hay dos opciones principales:

- **Dashboard** (`/produccion`): kilos por período y producto/variante, cantidad de ciclos finalizados, historial paginado y comparación. Filtros coherentes por máquina y período; borradores aparte.
- **Máquina** (`/produccion/maquina`): selector entre los equipos registrados, visor basado en el diseño v2 y acceso a registrar o abrir un ciclo. Las rutas existentes de alta y detalle comparten esta experiencia. Gestionar máquinas queda como acción secundaria.

El flujo actual es Máquina → elegir equipo → registrar pasada terminada → guardar → consultar el resultado en Dashboard. Abrir una fila del historial recupera el ciclo en Máquina. Se comienza con dos máquinas de 16 bandejas y se admite agregar más.

## Próximo plan: Interfaz v2

El usuario confirmó el 12/10/2026 **Máquina primero** para el flujo de registro. La navegación actual ofrece accesos directos a `/produccion/maquina` y `/produccion`; las rutas de alta y detalle se conservan. La implementación está parcial en la rama; ver avances y criterios pendientes en la especificación.

Ver [revisión UI/UX del 12/10](revisiones/REVISION_UI_2026-10-12.md) y [plan y criterios de Interfaz v2](specs/frontend/002-interfaz-v2.md). Orden de entregas: edición segura de pesos → entrada y consulta Máquina → registro centrado en máquina → Dashboard → Muestras → consistencia general → importación. Cada corte conserva permisos, módulos y reglas de datos, e incluye verificación propia.

Se implementaron la navegación y los filtros del Dashboard, la entrada Máquina y selección de equipo/ciclo, la adaptación del modelo y sus controles, y el panel/editor con tabla y guardado compartidos. Las pruebas de integración y navegador verificaron persistencia, sumas, selección 3D y celular. No fueron necesarias nuevas entidades ni migraciones para esta reorganización.

Ajuste del visor solicitado el 12/10: barra con solo zoom y pantalla completa, acercar bandeja como icono, opciones visuales mediante casillas y panel «Tu equipo» inicialmente oculto con preferencia guardada en el navegador. Alcance y criterios en Producción v1 e Interfaz v2.

El visor admite deseleccionar la bandeja activa y volver a la cámara general. Pantalla completa amplía solo la máquina, con zoom y salida sobre el lienzo.

El alcance detallado, los archivos afectados y los criterios de aceptación están en [Producción v1](specs/backend/006-produccion-v1.md). La referencia visual local aporta diseño e interacciones; catálogo, bandejas y pesos provienen de los datos guardados. Los resultados agrupados conservan su peso conjunto y los ciclos mantienen la configuración histórica del equipo.

La rama `dev/blackfruit` permite probar migraciones antes de aplicarlas a `production`. La URL agrupada es para la app; la directa, para migraciones. `neon deploy` solo configura Neon. Los secretos y el prototipo local quedan fuera del repositorio público.

En producción, `ALLOWED_LOGIN_EMAILS` contiene los dos correos autorizados. Las cuentas se provisionan por separado; el registro público permanece cerrado. Ver [acceso limitado a dos correos](specs/backend/002-acceso-dos-correos-v1.md).

Para desplegar, consultar [ejecución y despliegue](specs/db/001-ejecucion-despliegue-v1.md), comprobar migraciones y permisos, configurar variables en Vercel y verificar el acceso. La restauración completa y la recuperación por correo siguen pendientes para uso cotidiano.
