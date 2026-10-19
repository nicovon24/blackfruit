# BlackFruit

Aplicación privada para registrar ventas de frutas deshidratadas. Usa Next.js, Better Auth, Prisma y PostgreSQL en Neon.

## Estado

El acceso requiere sesión y permiso de administrador. La app permite registrar ventas por importe, consultar el dashboard por mes, rango o histórico, gestionar y reutilizar clientes e importar ventas XLSX/CSV con revisión previa. Clientes tiene alta por diálogo; Productos tiene listado, alta, edición y archivo. La papelera reversible reúne ventas, clientes sin relaciones, ciclos y muestras. También se pueden configurar máquinas y catálogo, registrar ciclos con pesos individuales o agrupados, importar producción XLSX con revisión, consultar su dashboard y registrar muestras en un diálogo separado de ventas. El menú agrupa Comercial, Producción y Catálogo, con accesos directos al Dashboard de producción y a Máquinas; el visor 3D, el panel y la vista de bandejas muestran el mismo ciclo. Los formularios de fechas completas usan `dd/mm/yyyy`. Quedan pendientes el despliegue de este corte, la recuperación por correo, el alta manual de líneas de venta y un ensayo de restauración para el uso cotidiano.

## Desarrollo local

Requiere Node.js compatible con `package.json` y una rama de Neon separada de `production`. Copiar `.env.example` a `.env.local` y completar `DATABASE_URL` agrupada, `DATABASE_URL_UNPOOLED` directa y `BETTER_AUTH_SECRET`. La URL pública se obtiene de cada solicitud y los dominios de Vercel se toman de sus variables del sistema; no hay que configurar `APP_URL`. En producción configurar además `ALLOWED_LOGIN_EMAILS` con exactamente dos correos separados por coma; si falta, el acceso se cierra. Nunca subir esos valores al repositorio.

```bash
npm ci
npm run db:status
npm run db:generate
npm run dev
```

La app queda en `http://localhost:3000`. El puerto se puede cambiar con `npm run dev -- -p 3100`. Las migraciones se aplican por separado con `npx prisma migrate deploy`; `neon deploy` configura Neon y no migra tablas.

## Docker

Con `.env.local` configurado:

```bash
docker compose up --build -d
docker compose ps
```

El contenedor sirve Next.js en el puerto 3000 y usa la base remota indicada por las variables de entorno. `design/` y los archivos locales de credenciales quedan fuera de la imagen.

Para publicar otro puerto local en PowerShell: `$env:BLACKFRUIT_PORT=3100; docker compose up -d`. La app reconoce `localhost` con ese puerto sin configurar una URL.

## Verificación

```bash
npm run typecheck
npm run lint
npm run build
npm run test:auth
npm run test:sales
npm run test:imports
npm run test:login-allowlist
```

El corte de producción y muestras agrega pruebas de dominio en `tests/production-machine.test.ts`, `tests/production-cycle.test.ts` y `tests/samples-domain.test.ts`, además de recorridos de integración y navegador en `tests/production-integration.ts`, `tests/samples-integration.ts` y `tests/production-samples-browser.ts`. Estos últimos requieren `dev/blackfruit` y limpian los datos QA que crean. Las nuevas migraciones se aplicaron solo a esa rama de Neon; aún no se desplegaron en `production`.

Para las mejoras de clientes, períodos y producción: `node --import tsx tests/production-import.test.ts`, `node --env-file=.env.local --import tsx tests/improvements-integration.ts`, `node --env-file=.env.local --import tsx tests/production-import-integration.ts` y, con la app local iniciada, `node --env-file=.env.local --import tsx tests/improvements-browser.ts`. Los ejemplos ficticios del dashboard de producción pueden cargarse de forma idempotente solo en `dev/blackfruit` con `node --env-file=.env.local --import tsx scripts/seed-production-example.ts`; fueron retirados de esa rama el 18/10/2026.

Las pruebas de integración y navegador usan una rama de desarrollo y datos QA temporales; ver los scripts de `package.json`. `npm run test:login-allowlist:integration` prueba inicio de sesión y revocación con Better Auth en esa rama. El modelo y los criterios de aceptación están en [el plan](docs/PLAN_IMPLEMENTACION.md) y [las especificaciones](docs/specs/).

El ensayo de asociación de clientes existentes a ventas importadas se describe en [su especificación](docs/specs/migrations/002-clientes-desde-ventas-dev.md). Solo opera en `dev/blackfruit`; `npm run dev:preview-sale-customers` muestra el reporte y `npm run dev:backfill-sale-customers -- --execute` ejecuta el backfill protegido.

La papelera se verifica con `npm run test:trash:integration` y `npm run test:trash:browser`. Para revisar ejemplos de producción que podría limpiar el script, ejecutar `npm run dev:cleanup-example`. Solo para ejecutar esa limpieza en la rama de desarrollo conocida: `npm run dev:cleanup-example -- --execute`. El script rechaza referencias externas al ejemplo; la vista previa no modifica datos. La aplicación no ofrece borrado definitivo.

## Diseño de interfaz con Codex

Los skills locales [Impeccable](.agents/skills/impeccable/SKILL.md) (v4.5.2) y [UI UX Pro Max](.agents/skills/ui-ux-pro-max/SKILL.md) (v2.15.0) ayudan a diseñar, revisar y pulir las pantallas. Reiniciar Codex permite descubrirlos en una sesión nueva. Impeccable se instaló sin hook automático; su detector puede ejecutarse bajo demanda. UI UX Pro Max incluye una búsqueda local que usa Python. Ninguno es una dependencia de ejecución de la aplicación.

## Privacidad

Este repositorio público contiene código y documentación genérica. El prototipo de `design/`, la planilla de origen, los respaldos, las credenciales y los datos reales de ventas permanecen fuera de Git. Las rutas privadas verifican sesión y permiso en el servidor.
