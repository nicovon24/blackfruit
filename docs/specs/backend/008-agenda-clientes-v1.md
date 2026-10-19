# Agenda de clientes v1

Actor: administrador. Resultado: crear una persona independientemente de una venta, encontrarla y seleccionarla por ID en ventas y muestras. El cliente puede conservar nombre, teléfono y email; el nombre es obligatorio. La selección «Sin cliente» sigue válida en ventas.

Reglas: nombres iguales no se fusionan. El alta valida los límites vigentes de `Customer`, deja auditoría y comprueba `customers:write`; consulta y selección comprueban `customers:read`. La agenda y el selector usan búsqueda y páginas acotadas; el cliente ya seleccionado sigue visible aunque no esté en la primera página. El corte original no editaba ni eliminaba clientes. La ampliación por diálogo y papelera está en [la especificación 010](010-papelera-catalogo-v1.md).

Estados: vacío, buscando, resultados, sin coincidencias, creando, guardando, error. Datos: Customer existente, sin nueva entidad. Los errores por campo se muestran sin descartar lo ingresado.

Aceptación: crear en agenda, seleccionar en dos ventas y una muestra, recargar y ver el mismo ID; distinguir homónimos por contacto; buscar fuera de primera página; reintentar alta sin duplicar.
