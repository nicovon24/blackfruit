# Arquitectura inicial

## Estructura

| Carpeta | Responsabilidad |
| --- | --- |
| `src/app/` | Rutas, layouts, Server Components, Actions y Route Handlers |
| `src/components/ui/` | Controles básicos de shadcn/ui, sin reglas del negocio |
| `src/components/layout/` | Estructura visual común: navegación, encabezados y contenedores |
| `src/components/shared/` | Componentes reutilizados entre pantallas |
| `src/hooks/` | Comportamiento reutilizable de la interfaz cliente |
| `src/lib/` | Integraciones y utilidades técnicas compartidas |
| `src/modules/` | Reglas, casos de uso y adaptadores por área de negocio |
| `prisma/` | Esquema PostgreSQL y migraciones versionadas de Prisma 7 |
| `tests/` | Pruebas de reglas y recorridos críticos |
| `design/` | Prototipo local privado, excluido de Git y Docker |
| `docs/` | Decisiones, procedimientos y límites del alcance |
| `public/` | Solo archivos destinados a ser públicos; nunca ventas o datos de clientes |

## SOLID aplicado al proyecto

Una operación de venta calcula su total en el dominio; una ruta solo valida la
sesión y la entrada y llama al caso de uso. Los casos de uso dependen de
contratos de repositorio, y un adaptador de PostgreSQL los implementa. Así
podemos probar reglas sin una base y cambiar Neon por otro PostgreSQL sin
cambiar el dominio. Separaremos interfaces cuando aparezcan consumidores
distintos, como el catálogo público y la administración privada.

La separación sigue estos criterios:

- **Responsabilidad única:** el dominio calcula y valida reglas; los casos de uso coordinan; los adaptadores guardan y consultan; la interfaz presenta.
- **Extensión sin reescritura:** nuevos canales de venta o proveedores de almacenamiento implementarán contratos necesarios sin agregar condiciones del proveedor a las reglas del negocio.
- **Sustitución:** cada adaptador debe respetar el mismo contrato y las mismas garantías, en especial transacciones e idempotencia para importar.
- **Interfaces pequeñas:** cada caso de uso recibe solo las operaciones que utiliza; el catálogo público no obtiene acceso a ventas ni clientes.
- **Inversión de dependencias:** los módulos de negocio no importan Neon, Next.js ni componentes de UI. La composición ocurre en la capa de aplicación.

Crearemos `domain/`, `application/` e `infrastructure/` dentro de cada módulo al implementar ese módulo. No se agregan clases ni interfaces vacías antes de tener un caso de uso concreto. El módulo de ventas ya separa validación exacta del importe, casos de uso y persistencia. La primera ruta por importe demostró guardar, recargar y actualizar indicadores desde PostgreSQL; las líneas de producto tendrán un caso de uso propio.

## Fronteras de datos y despliegue

La importación separa lectura de archivos en `infrastructure/read-workbook`, cálculo/mapeo en `domain/parse-import`, revisión de negocio en `application/review-import` y persistencia transaccional en `infrastructure/prisma-import-service`. La revisión depende de un contrato pequeño para consultar procedencias y clientes; no importa Prisma. El adaptador garantiza transacción, unicidad y conciliación. Los diálogos de ventas usan las mismas acciones/casos de uso que las rutas directas.

La base se configura con variables de entorno. Las migraciones versionadas serán la fuente del esquema; `neon deploy` aplica la política de Neon definida en `neon.ts` y no sustituye las migraciones. Para una futura migración a Supabase o AWS, el dominio y los casos de uso deben conservarse; se restaurarán esquema y datos en PostgreSQL y se configurarán allí conexiones, secretos, correo y archivos. El procedimiento de backup/restauración figura en el README y se debe ensayar antes de usar datos cotidianos.

El HTML de `design/` contiene datos reales y permanece fuera de Git, Docker y `public/`. La aplicación protege las ventas mediante sesión y permiso en el servidor.
