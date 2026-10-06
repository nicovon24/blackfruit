# Módulos de negocio

Cada módulo se divide cuando el código lo necesita:

- `domain/`: entidades, valores y reglas sin Next.js ni Neon.
- `application/`: casos de uso y contratos de repositorio.
- `infrastructure/`: implementaciones para PostgreSQL y otros servicios.

Las rutas de `src/app/` y los componentes de `src/components/` delegan en los
casos de uso. El catálogo público futuro tendrá una interfaz de lectura
separada de las operaciones privadas.

Áreas iniciales reservadas: `auth/` (acceso y permisos), `sales/` (ventas),
`samples/` (entregas de muestra), `customers/`, `catalog/`, `imports/` y
`reporting/` (indicadores). Cada carpeta recibirá código y subdivisiones cuando
se implemente su primer caso de uso; una carpeta vacía no implica una función
operativa.
