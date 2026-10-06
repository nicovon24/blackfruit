# Neon en BlackFruit

Usar ramas separadas para desarrollo y producción. `dev/blackfruit` se usa para implementar y probar migraciones; `production` sirve a la app publicada. Las URLs y el identificador del proyecto se guardan localmente y no se publican.

`DATABASE_URL` es la URL agrupada para la aplicación y `DATABASE_URL_UNPOOLED` es la URL directa para Prisma Migrate y respaldos. `.env.local` y `.env.production.local` están ignorados por Git. No copiar credenciales al código ni a Docker.

```bash
neon status
neon config plan
neon deploy
npm run db:status
```

`neon deploy` configura el proyecto de Neon; no ejecuta migraciones del esquema. Las migraciones viven en `prisma/migrations/` y se aplican con `prisma migrate deploy` sobre la rama elegida explícitamente. Antes de cambiar producción, comprobar el destino y ensayar un respaldo y su restauración en una rama aislada.

La base usa PostgreSQL estándar mediante Prisma. Referencias: [Neon CLI](https://neon.com/cli), [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) y [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).

\n