# Plan de implementación de BlackFruit

El desarrollo sigue especificación, implementación de una ruta completa y verificación. Los criterios observables están en `docs/specs/`.

| Corte | Estado | Resultado |
| --- | --- | --- |
| Preparación | Completado | Next.js, Prisma, Better Auth y rama de desarrollo de Neon. |
| Acceso privado | Parcial | Login, cierre y permiso admin comprobados; falta recuperación por correo. |
| Ventas | Parcial | Ventas por importe, estados, auditoría, dashboard y clientes en el flujo de ventas; faltan líneas manuales y catálogo independiente. |
| Importación | Implementado | XLSX/CSV, revisión, muestras, exclusiones, procedencia e idempotencia. El archivo real se confirma únicamente por decisión del administrador dentro de la app. |
| Uso cotidiano | Pendiente | Exportación de consulta, restauración ensayada, recuperación de cuenta y QA final. |

La app calcula totales con decimales exactos y conserva precios y descripciones históricos. Las muestras no son ventas. Una venta puede carecer de cliente; el nombre del archivo de origen no identifica a una persona por sí solo.

La rama `dev/blackfruit` permite probar migraciones antes de aplicarlas a `production`. La URL agrupada es para la app; la directa, para migraciones. `neon deploy` solo configura Neon. Los secretos y el prototipo local quedan fuera del repositorio público.

Para desplegar, consultar [ejecución y despliegue](specs/ejecucion-despliegue-v1.md), comprobar migraciones y permisos, configurar variables en Vercel y verificar el acceso. La restauración completa y la recuperación por correo siguen pendientes para uso cotidiano.

\n