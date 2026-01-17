import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  // Custom rules for better code quality
  {
    rules: {
      // Prevent common mistakes
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": "off", // TypeScript handles this
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      // Allow setState in useEffect (common hydration pattern)
      "react-hooks/set-state-in-effect": "off",

      // React best practices
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-key": "error",
      "react/self-closing-comp": "warn",
      "react/no-array-index-key": "warn",

      // Import organization (when eslint-plugin-import is available)
      "import/order": ["warn", {
        "groups": [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "type"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }],
      "import/no-duplicates": "warn",

      // Accessibility
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
    }
  }
]);

export default eslintConfig;
