import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", ".wrangler/**", "eslint.config.mjs"] },
  ...tseslint.configs.strictTypeChecked,
  {
    files: ["src/**/*.ts"],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
);
