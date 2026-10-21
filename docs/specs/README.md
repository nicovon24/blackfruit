# Specifications

Specifications are grouped by area and use consecutive numbering within each category in the format `001-name.md`. When consolidating or retiring documents, renumber active specs in that category and update all links. Numbering is independent per folder.

- [`backend/`](backend/): business and server capability rules, permissions, states, and acceptance criteria.
- [`frontend/`](frontend/): interface behavior and acceptance criteria.
- [`db/`](db/): database and deployment setup and operations.
- [`migrations/`](migrations/): schema changes, application order, and rollback/recovery.
- [`bugs/`](bugs/): expected behavior for reproducible defects and correction criteria.

Specs are the source of product criteria; implementation details belong in code. State undecided business choices explicitly rather than making assumptions.

## Canonical Specifications

Each topic has one primary spec to reduce overlap. Merged complementary work lives in the spec containing the relevant business rule; dated notes and implementation results belong in `docs/CHECKLOG.md` or `docs/revisiones/`.

- **Access and allowlist:** `backend/001-acceso-privado-v1.md`.
- **Sales and contextual customer linking:** `backend/002-ventas-v1.md`.
- **Sales/sample/production imports and reversible trash:** `backend/003-importacion-papelera-v1.md`. Each capability retains separate sections, rules, and acceptance criteria.
- **Production and machines:** `backend/004-produccion-v1.md`.
- **Samples:** `backend/005-muestras-v1.md`.
- **Customer records, contact data, customer editing, and catalog:** `backend/006-agenda-clientes-catalogo-v1.md`.
- **Navigation, components, and shared themes:** `frontend/001-interfaz-v1.md`.
- **Interface v2 flows and navigation:** `frontend/002-interfaz-v2.md`; it preserves redesign-specific decisions and deliveries.
- **Dates and periods:** `frontend/003-fechas-periodos-v1.md`.
