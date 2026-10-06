# BlackFruit: guía de trabajo

BlackFruit es una aplicación privada para gestionar ventas de frutas deshidratadas. Leer `README.md`, `docs/PLAN_IMPLEMENTACION.md` y la especificación de la capacidad que se va a cambiar antes de implementar.

## Desarrollo guiado por especificaciones (SDD)

1. Registrar cada capacidad relevante en `docs/specs/` con actor, resultado, reglas, estados, datos, permisos, errores y criterios de aceptación observables. Las decisiones pendientes deben quedar explícitas; no inventar reglas del negocio.
2. Implementar una ruta completa y pequeña: pantalla o entrada → caso de uso → persistencia → lectura. Mantener la especificación y el código alineados.
3. Comprobar las reglas y fallos de mayor riesgo con pruebas de dominio o integración. Verificar `npm run typecheck`, `npm run lint` y `npm run build` antes de dar por terminado un corte funcional.
4. Revisar el resultado contra los criterios de aceptación y actualizar los documentos cuando cambie una decisión. Usar las skills de ECC que correspondan al trabajo; ECC es una herramienta de ingeniería, no una dependencia de la aplicación.

## Límites del código y de los datos

- `src/app/` recibe solicitudes, valida sesión/permiso y delega. `src/modules/` contiene reglas y casos de uso; `src/lib/`, integraciones técnicas; `src/components/ui`, `layout` y `shared`, presentación.
- El servidor calcula los totales. Usar importes decimales exactos; conservar precio y descripción de cada línea histórica. Una venta con varias líneas cuenta una sola vez.
- Las muestras no son ventas. Una venta puede no tener cliente. Un nombre escrito en la planilla no identifica por sí solo a una persona.
- El HTML de `design/` contiene nombres reales: mantenerlo fuera de `public/` y no exponer datos privados antes de contar con autorización en el servidor.
- Desarrollar y probar migraciones en una rama de Neon distinta de `production`. `neon deploy` configura Neon; las migraciones del esquema son un proceso aparte.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
