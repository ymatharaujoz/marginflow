import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export function createBaseConfig({
  additionalIgnores = [],
  tsconfigRootDir,
} = {}) {
  return defineConfig([
    ...tseslint.configs.recommended,
    ...(tsconfigRootDir
      ? [
          {
            languageOptions: {
              parserOptions: { tsconfigRootDir },
            },
          },
        ]
      : []),
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
