# BlackFruit

Aplicación privada para registrar ventas de frutas deshidratadas. Usa Next.js, Better Auth, Prisma y PostgreSQL en Neon.

## Estado

El acceso requiere sesión y permiso de administrador. La app permite registrar ventas por importe, consultar el dashboard, gestionar clientes dentro del flujo de ventas e importar XLSX/CSV con revisión previa. Las muestras no se contabilizan como ventas. Quedan pendientes la recuperación por correo, el alta manual de líneas de producto, la gestión independiente del catálogo y un ensayo de restauración para el uso cotidiano.

## Desarrollo local

Requiere Node.js compatible con `package.json` y una rama de Neon separada de `production`. Copiar `.env.example` a `.env.local` y completar `DATABASE_URL` agrupada, `DATABASE_URL_UNPOOLED` directa, `BETTER_AUTH_SECRET` y `APP_URL`. Nunca subir esos valores al repositorio.

```bash
npm ci
npm run db:status
npm run db:generate
npm run dev
```

La app queda en `http://localhost:3000`. Las migraciones se aplican por separado con `npx prisma migrate deploy`; `neon deploy` configura Neon y no migra tablas.

## Docker

Con `.env.local` configurado:

```bash
docker compose up --build -d
docker compose ps
```

El contenedor sirve Next.js en el puerto 3000 y usa la base remota indicada por las variables de entorno. `design/` y los archivos locales de credenciales quedan fuera de la imagen.

## Verificación

```bash
npm run typecheck
npm run lint
npm run build
npm run test:auth
npm run test:sales
npm run test:imports
```

Las pruebas de integración y navegador usan una rama de desarrollo y datos QA temporales; ver los scripts de `package.json`. El modelo y los criterios de aceptación están en [el plan](docs/PLAN_IMPLEMENTACION.md) y [las especificaciones](docs/specs/).

## Privacidad

Este repositorio público contiene código y documentación genérica. El prototipo de `design/`, la planilla de origen, los respaldos, las credenciales y los datos reales de ventas permanecen fuera de Git. Las rutas privadas verifican sesión y permiso en el servidor.

\n