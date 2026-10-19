# Especificaciones

Las especificaciones se agrupan por área y usan numeración local con el formato `001-nombre.md`. La numeración es independiente por carpeta: al agregar un documento, usa el siguiente número disponible dentro de su categoría y conserva los números existentes.

- [`backend/`](backend/): reglas, permisos, estados y criterios de aceptación de capacidades del servidor y del negocio.
- [`frontend/`](frontend/): comportamiento y criterios de aceptación de interfaz.
- [`db/`](db/): configuración y operación de base de datos y despliegue.
- [`migrations/`](migrations/): cambios de esquema, orden de aplicación y reversión/recuperación.
- [`bugs/`](bugs/): comportamiento esperado para defectos reproducibles y criterios de corrección.

Los specs se mantienen como fuente de criterios de producto; los detalles de implementación pertenecen al código. Cuando una decisión de negocio esté pendiente, se deja explícita en el spec.
