import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "drizzle.config.ts",
    ],
  },
  {
    files: ["**/*.ts"],
    plugins: {
      "@stylistic": stylistic,
      "@eslint-community/eslint-comments": eslintComments,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // --- Strict File Length ---
      "max-lines": [
        "error",
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // --- Zero Escape Hatches (No Inline or File-Level Disabling) ---
      "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": true,
          "ts-check": false,
        },
      ],

      // --- Strict Type Safety & Zero Any ---
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-unused-vars": "off", // Handled by unused-imports/no-unused-vars

      // --- Auto-Removing Unused Imports & Variables ---
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // --- Deterministic Import & Export Sorting with @/ Path Aliases ---
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // 1. Node.js built-ins (e.g. node:fs, node:path)
            ["^node:"],
            // 2. Third-party npm packages (e.g. fastify, drizzle-orm, zod)
            ["^@?\\w"],
            // 3. First-party internal path aliases (e.g. @/modules, @/shared, @/config, @/database)
            ["^@/"],
            // 4. Relative parent and sibling imports (e.g. ../, ./)
            ["^\\.\\.(?!/?$)", "^\\.\\./?$", "^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            // 5. Side-effect and style imports
            ["^\\u0000"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",

      // --- Linter-Only Formatting (No Prettier) ---
      "@stylistic/indent": ["error", 2],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/eol-last": ["error", "always"],
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
    },
  },
);
