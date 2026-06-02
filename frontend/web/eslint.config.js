import next from "eslint-config-next/core-web-vitals";

// ESLint 9 flat config. Next 16's `eslint-config-next` ships a *native* flat
// config array (Linter.Config[]), so it's spread directly — no FlatCompat /
// @eslint/eslintrc shim (that legacy bridge double-wraps the already-flat config
// and crashes the eslintrc validator).
const config = [
  // Global ignores — build output and deps are never linted.
  { ignores: [".next/**", "node_modules/**", "dist/**"] },
  ...next,
];

export default config;
