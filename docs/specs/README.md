# Especificaciones

Las especificaciones se agrupan por área y usan numeración local consecutiva con el formato `001-nombre.md`. Al consolidar o retirar documentos, renumerar los specs vigentes de esa categoría y actualizar todos sus enlaces. La numeración es independiente por carpeta.

- [`backend/`](backend/): reglas, permisos, estados y criterios de aceptación de capacidades del servidor y del negocio.
- [`frontend/`](frontend/): comportamiento y criterios de aceptación de interfaz.
- [`db/`](db/): configuración y operación de base de datos y despliegue.
- [`migrations/`](migrations/): cambios de esquema, orden de aplicación y reversión/recuperación.
- [`bugs/`](bugs/): comportamiento esperado para defectos reproducibles y criterios de corrección.

Los specs se mantienen como fuente de criterios de producto; los detalles de implementación pertenecen al código. Cuando una decisión de negocio esté pendiente, se deja explícita en el spec.

## Especificaciones canónicas

Para reducir documentos solapados, cada tema tiene un spec principal. Los cortes complementarios que se fusionaron viven dentro del que contiene la regla de negocio correspondiente; las notas de fecha y el resultado de implementación van en `docs/CHECKLOG.md` o `docs/revisiones/`.

- **Acceso y allowlist:** `backend/001-acceso-privado-v1.md`.
- **Ventas y vínculo contextual de clientes:** `backend/002-ventas-v1.md`.
- **Importación de ventas/muestras y producción, y papelera reversible:** `backend/003-importacion-papelera-v1.md`. Las capacidades conservan secciones, reglas y aceptación independientes.
- **Producción y máquinas:** `backend/004-produccion-v1.md`.
- **Muestras:** `backend/005-muestras-v1.md`.
- **Agenda, datos de contacto, edición de clientes y catálogo:** `backend/006-agenda-clientes-catalogo-v1.md`.
- **Navegación, componentes y temas compartidos:** `frontend/001-interfaz-v1.md`.
- **Flujos y navegación de Interfaz v2:** `frontend/002-interfaz-v2.md`; conserva las decisiones y entregas específicas del rediseño.
- **Fechas/períodos:** `frontend/003-fechas-periodos-v1.md`.
