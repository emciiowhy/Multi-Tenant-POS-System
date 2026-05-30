# Shared packages build to `dist`; apps consume built output

The workspace mixes two runtimes (Node for the Express API, the Next.js/Turbopack bundler for the web app), and they disagree about module resolution. To keep both working without per-tool hacks:

- **Shared packages** (`@vendme/db`, `@vendme/auth`, `@vendme/contracts`) compile to `dist/` and expose it via `exports` (`types` → `dist/*.d.ts`, `default` → `dist/*.js`). They keep explicit `.js` extensions on relative imports because that is what Node ESM requires at runtime. Turbo's `^build` ordering guarantees `dist` exists before any app typechecks or builds.
- **`backend/api`** uses `.js`-extension imports too (runs under tsx in dev, `node dist` in prod — both want explicit ESM extensions).
- **`frontend/web`** uses extensionless / `@/`-alias imports in its own source, because Next/Turbopack resolves TypeScript that way and does **not** rewrite `.js`→`.ts` for app source.

## Why record this

It looks inconsistent on purpose. A future engineer will be tempted to either (a) make the packages export raw `./src/*.ts` so there's no build step, or (b) add `.js` extensions everywhere for "consistency". Both break a runtime: (a) breaks the Next bundler (it can't follow `.js` imports into `.ts` source), and (b) breaks Turbopack's app-source resolution. The split is the working equilibrium.

## Consequence

Editing a shared package requires it to be rebuilt before apps pick up the change (`turbo run build`, or a `--watch` build in dev). This is the accepted cost of consuming built output instead of source.
