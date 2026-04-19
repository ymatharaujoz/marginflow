import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export function createBaseConfig({ additionalIgnores = [] } = {}) {
  return defineConfig([
    ...tseslint.configs.recommended,
    globalIgnores([
      "dist/**",
      "coverage/**",
      "node_modules/**",
      ".turbo/**",
      ...additionalIgnores,
    ]),
  ]);
}

export default createBaseConfig;
