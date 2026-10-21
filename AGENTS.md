# BlackFruit: Working Guide

BlackFruit is a private application for managing sales of dried fruit. Before implementing a change, read `README.md`, `docs/CHECKLOG.md`, and the specification for the capability being changed.

## Documentation and Product Language

- Write and maintain all repository documentation in English, including `README.md`, `AGENTS.md`, product notes, specifications, check logs, reviews, and Markdown files in source folders. Translate existing Spanish prose when editing a document; do not add new Spanish documentation.
- Spanish is reserved for the product's user-facing interface and for business data whose original language must be preserved, such as customer-entered names, imported spreadsheet content, and historical records. Keep exact Spanish UI labels in English documentation only when referring to the literal text shown in the app; explain their meaning in English.
- Preserve code identifiers, file names, routes, commands, and source data as written. Do not translate or alter business data as part of a documentation change.

## Specification-Driven Development (SDD)

1. Document each relevant capability in `docs/specs/`, including actor, outcome, rules, states, data, permissions, errors, and observable acceptance criteria. Make undecided choices explicit; do not invent business rules.
2. Implement a small, complete path: screen or entry point → use case → persistence → readback. Keep the specification and code aligned.
3. Check high-risk rules and failures with domain or integration tests. Run `npm run typecheck`, `npm run lint`, and `npm run build` before considering a functional slice complete.
4. Review the result against its acceptance criteria and update documents when a decision changes. Use the relevant ECC skills; ECC is an engineering tool, not an application dependency.
5. For interface changes, use the local `impeccable` and `ui-ux-pro-max` skills in `.agents/skills/`, preserve BlackFruit's identity, and review desktop and mobile layouts.

## Code and Data Boundaries

- `src/app/` receives requests, validates sessions and permissions, and delegates. `src/modules/` contains business rules and use cases; `src/lib/` contains technical integrations; `src/components/ui`, `layout`, and `shared` contain presentation.
- The server calculates totals. Use exact decimal amounts and preserve each historical line's price and description. A sale with multiple lines counts as one transaction.
- Samples are not sales. A sale may have no customer. A name written in a spreadsheet does not by itself identify a person.
- The HTML in `design/` contains real names: keep it out of `public/` and do not expose private data until server-side authorization is in place.
- Develop and test migrations on a Neon branch other than `production`. `neon deploy` configures Neon; schema migrations are a separate process.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
