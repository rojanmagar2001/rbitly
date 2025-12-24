const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");

module.exports = [
  // Base JS rules
  js.configs.recommended,
  prettier,

  // TypeScript (type-aware) ONLY for TS files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommendedTypeChecked[0].rules,
      ...tseslint.configs.recommendedTypeChecked[1].rules,
      ...tseslint.configs.recommendedTypeChecked[2].rules,

      // Your stricter rules
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/require-await": "off",
    },
  },

  // JS/CJS config files: do NOT use TS parser or typed linting
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.node,
      },
    },
  },

  // Ignore build output
  {
    ignores: ["dist/**", "node_modules/**", "prisma.config.ts"],
  },
];
