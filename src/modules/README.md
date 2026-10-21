# Business Modules

Each module is divided as the code requires:

- `domain/`: entities, values, and rules independent of Next.js and Neon.
- `application/`: use cases and repository contracts.
- `infrastructure/`: implementations for PostgreSQL and other services.

Routes in `src/app/` and components in `src/components/` delegate to use cases. A future public catalog will have a read-only interface separate from private operations.

Initial areas: `auth/` (access and permissions), `sales/`, `samples/`, `customers/`, `catalog/`, `imports/`, and `reporting/` (metrics). Code and subdivisions are added when the first use case is implemented; an empty folder does not imply an operational feature.
