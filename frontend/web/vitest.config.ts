import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// - Automatic JSX runtime (react/jsx-runtime) so .tsx tests don't need `import React`.
// - `@/` alias mirrors tsconfig paths so component tests resolve app imports.
// Per-file environments use the `// @vitest-environment jsdom` docblock; pure
// logic tests stay on node.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
});
