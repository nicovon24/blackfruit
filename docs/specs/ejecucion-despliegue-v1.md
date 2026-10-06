# Especificación: ejecución y despliegue v1

## Actor y resultado

La persona administradora ejecuta BlackFruit localmente, comprueba el acceso privado y prepara un despliegue de la aplicación y PostgreSQL sin mezclar desarrollo con producción.

## Reglas, datos y permisos

- La aplicación recibe `DATABASE_URL` agrupada, `BETTER_AUTH_SECRET` y `APP_URL` del entorno de ejecución. Las credenciales nunca se copian a la imagen ni al repositorio.
- El contenedor sirve Next.js en el puerto 3000 y usa la base remota indicada por `DATABASE_URL`; Compose no crea otra base ni aplica migraciones.
- Las migraciones versionadas se validan primero en una rama Neon distinta de `production`. Pasar a producción requiere revisar y probar el esquema, el respaldo y la restauración, y provisionar una cuenta administrativa de ese entorno.
- La compilación de Docker utiliza valores ficticios solo para generar el artefacto. El servidor comprueba sus variables reales al atender las rutas privadas.
- El acceso a ventas e importación exige sesión y permiso en el servidor, también dentro del contenedor. `APP_URL` debe coincidir con el origen público que usa el navegador.

## Estados y errores

- Sin variables o con una base inaccesible, la aplicación no puede completar el acceso privado y se considera no disponible.
- Sin sesión, las rutas privadas redirigen al login; sin permiso, se rechazan.
- Una imagen saludable responde en `/login`; este control no sustituye la comprobación de conexión a PostgreSQL ni un inicio de sesión real.
- Una migración pendiente, un respaldo sin restauración ensayada o la ausencia de recuperación de cuenta se informan como bloqueos para el uso cotidiano en producción.

## Criterios de aceptación

- [x] `npm run typecheck`, `npm run lint`, `npm run build` y pruebas críticas pasan.
- [x] Docker construye la imagen sin incluir `.env.local`, `.neon` ni `design/`.
- [x] `docker compose up --build -d` deja la app saludable en `http://localhost:3000/login`.
- [x] `/dashboard` redirige sin sesión y una sesión administrativa puede consultar datos de la rama de desarrollo.
- [x] El estado de migraciones de desarrollo coincide con los archivos versionados.
- [ ] Antes de producción: migraciones, respaldo/restauración y acceso administrativo se prueban con datos y secretos del entorno definitivo.

## Estado comprobado el 6 de octubre de 2026

Docker ejecuta la aplicación localmente contra `dev/blackfruit`; Chrome completó dos veces el recorrido de login, ventas, clientes e importación. Las cuatro migraciones están aplicadas en desarrollo. `production` aún no tiene el esquema de la aplicación. El repositorio local no tiene remoto Git ni vínculo `.vercel`. Faltan configurar el destino de despliegue, variables y dominio definitivos, migrar y provisionar la base de producción, y ensayar respaldo/restauración. Recuperación por email, alta manual de líneas y catálogo siguen pendientes del alcance de uso cotidiano.
