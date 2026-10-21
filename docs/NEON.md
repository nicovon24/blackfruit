# Neon in BlackFruit

Use separate branches for development and production. `dev/blackfruit` is used to implement and test migrations; `production` serves the published app. URLs and the project identifier are stored locally and must not be published.

`DATABASE_URL` is the pooled URL for the app, and `DATABASE_URL_UNPOOLED` is the direct URL for Prisma Migrate and backups. `.env.local` and `.env.production.local` are ignored by Git. Do not copy credentials into code or Docker.

```bash
neon status
neon config plan
neon deploy
npm run db:status
```

`neon deploy` configures the Neon project; it does not run schema migrations. Migrations live in `prisma/migrations/` and are applied with `prisma migrate deploy` to the explicitly selected branch. Before changing production, verify the target and rehearse a backup and restore on an isolated branch.

The database uses standard PostgreSQL through Prisma. References: [Neon CLI](https://neon.com/cli), [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate), and [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).
