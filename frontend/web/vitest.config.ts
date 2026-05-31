import { defineConfig } from "vitest/config";

// Use the automatic JSX runtime (react/jsx-runtime) so .tsx component tests
// don't need `import React`. Per-file environments are set with the
// `// @vitest-environment jsdom` docblock; pure logic tests stay on node.
export default defineConfig({
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
});
