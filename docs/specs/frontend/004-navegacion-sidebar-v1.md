# Navegación principal por tareas

Actor: administrador autenticado. Resultado: encontrar las áreas de trabajo en el menú lateral sin desplegar grupos.

La navegación muestra Inicio; Comercial con Ventas, Clientes y Muestras; Producción con Dashboard y Máquinas; Catálogo con Productos; y Papelera separada al final. Inicio abre el resumen general. Dashboard de Producción abre `/produccion`; Máquinas abre `/produccion/maquina`, donde se elige equipo y se accede a su gestión. Importar Excel permanece como acción contextual en Ventas y Producción.

Estados: la ruta actual se destaca con texto e indicador visible y `aria-current="page"`. Las rutas interiores de producción, como un ciclo o la importación, mantienen seleccionado Máquinas; `/produccion` destaca únicamente Dashboard. Los grupos son rótulos visibles en escritorio. En celular se muestran todos los destinos en una cuadrícula de dos filas, sin ocultar opciones tras un desplegable.

Datos y permisos: el menú solo contiene enlaces; las páginas mantienen sus comprobaciones de sesión y permiso en el servidor. No hay persistencia ni migración. Error de acceso: la ruta existente muestra la respuesta autorizada por el servidor.

Aceptación observable: desde cualquier página se llega a los ocho destinos con un clic; Ventas, Clientes y Muestras aparecen juntos; Productos tiene grupo propio; Papelera queda apartada; Dashboard y Máquinas no se marcan activos al mismo tiempo; los enlaces se pueden usar con teclado y en pantallas pequeñas sin desbordamiento horizontal. Verificar en escritorio y celular, más `typecheck`, `lint` y `build`.
