# Especificación: ejecución y despliegue v1

## Actor y resultado

La persona administradora ejecuta BlackFruit localmente, comprueba el acceso privado y prepara un despliegue de la aplicación y PostgreSQL sin mezclar desarrollo con producción.

## Reglas, datos y permisos

- La aplicación recibe `DATABASE_URL` agrupada y `BETTER_AUTH_SECRET` del entorno de ejecución. Las credenciales nunca se copian a la imagen ni al repositorio. No requiere `APP_URL`.
- El contenedor sirve Next.js en el puerto 3000 y usa la base remota indicada por `DATABASE_URL`; Compose no crea otra base ni aplica migraciones.
- Las migraciones versionadas se validan primero en una rama Neon distinta de `production`. Pasar a producción requiere revisar y probar el esquema, el respaldo y la restauración, y provisionar una cuenta administrativa de ese entorno.
- La compilación de Docker utiliza valores ficticios solo para generar el artefacto. El servidor comprueba sus variables reales al atender las rutas privadas.
- El acceso a ventas e importación exige sesión y permiso en el servidor, también dentro del contenedor. Better Auth resuelve el origen por solicitud y solo acepta `localhost`/`127.0.0.1` con cualquier puerto y los dominios exactos que Vercel informa para este despliegue, su rama y su dominio principal. En producción un host desconocido se rechaza. En la rama de desarrollo, las llamadas administrativas directas de QA usan un fallback local calculado desde el puerto. La subida de archivos exige que `Origin` coincida con el origen de la solicitud.
- El puerto local predeterminado es 3000. Se puede cambiar al ejecutar Next o con `BLACKFRUIT_PORT` en Compose sin configurar una URL de la app.

## Estados y errores

- Sin variables o con una base inaccesible, la aplicación no puede completar el acceso privado y se considera no disponible.
- Sin sesión, las rutas privadas redirigen al login; sin permiso, se rechazan.
- Una imagen saludable responde en `/login`; este control no sustituye la comprobación de conexión a PostgreSQL ni un inicio de sesión real.
- Una solicitud con host no permitido no crea sesión; un origen ajeno no puede subir archivos aunque lleve una cookie válida.
- Una migración pendiente, un respaldo sin restauración ensayada o la ausencia de recuperación de cuenta se informan como bloqueos para el uso cotidiano en producción.

## Criterios de aceptación

- [x] `npm run typecheck`, `npm run lint`, `npm run build` y pruebas críticas pasan.
- [x] Docker construye la imagen sin incluir `.env.local`, `.neon` ni `design/`.
- [x] `docker compose up --build -d` deja la app saludable en `http://localhost:3000/login`.
- [x] `/dashboard` redirige sin sesión y una sesión administrativa puede consultar datos de la rama de desarrollo.
- [x] El estado de migraciones de desarrollo coincide con los archivos versionados.
- [x] Las diez migraciones y el acceso administrativo están provisionados en Neon `production`.
- [x] Probar una restauración completa en rama aislada antes de cargar ventas reales.
- [x] Desplegar en Vercel con variables cifradas y comprobar `/login` y la redirección de rutas privadas sin sesión en la URL definitiva.
- [ ] Comprobar inicio de sesión y lectura de rutas privadas con una sesión administrativa en la URL definitiva.
- [ ] La autenticación funciona en puerto local alternativo y en el dominio Vercel generado sin `APP_URL`; rechaza hosts no previstos.

## Estado comprobado el 6 de octubre de 2026

Docker ejecutó la aplicación localmente contra `dev/blackfruit`; Chrome completó dos veces el recorrido de login, ventas, clientes e importación. Las cuatro migraciones están aplicadas en desarrollo y `production`; en esta última se provisionó una cuenta administradora. Se creó un snapshot previo al esquema. El plan actual de Neon impidió crear un segundo snapshot para ensayar la restauración del esquema nuevo. El repositorio público se publicó sin archivos privados y el proyecto Vercel está creado. Falta conectar las credenciales de Neon a Vercel, desplegar y comprobar el acceso en línea. Recuperación por email, alta manual de líneas y catálogo siguen pendientes del uso cotidiano.

Tras quitar `APP_URL`, las pruebas de integración de sesión, ventas y control de origen de la subida pasaron en Docker tanto en el puerto 3000 como en el 3100. La imagen volvió a quedar saludable en `localhost:3000`. La comprobación del dominio de Vercel sigue pendiente del despliegue con sus credenciales.

## Estado comprobado el 20 de octubre de 2026

La configuración Vercel Production apuntaba a Neon `dev/blackfruit`, que contenía 32 ventas, 26 clientes, 4 productos y 3 lotes de importación; Neon `production` tenía cero ventas y clientes. Por decisión explícita del administrador, se preservó la rama anterior como `release-backup-20261020`, se probaron las seis migraciones pendientes sobre `release-test-20261020`, se restauró esa rama desde el respaldo y se comprobó que volvía al esquema anterior. Después se ensayó una copia completa de los datos de desarrollo en esa rama aislada y se copió ese estado a Neon `production`, preservando además la rama anterior como `production-pre-release-20261020`. Las diez migraciones quedaron aplicadas y los hashes de las 20 tablas coincidieron entre origen y destino.

Las variables `DATABASE_URL` y `DATABASE_URL_UNPOOLED` de Vercel Production se actualizaron a Neon `production`; `BETTER_AUTH_SECRET` y `ALLOWED_LOGIN_EMAILS` se conservaron. Las variables de Preview se limitaron a `feature/produccion-muestras-3d` y usan Neon `dev/blackfruit`. El commit `be4e4fc` quedó Ready en Preview y Production; `blackfruit-cba.vercel.app` apunta al despliegue Production. `/login` respondió 200 y `/dashboard` sin sesión redirigió a `/login`. No se pudo completar la comprobación autenticada de la URL publicada.
