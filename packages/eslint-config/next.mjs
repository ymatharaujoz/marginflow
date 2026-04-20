import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export function createRootConfig({
  additionalIgnores = [],
  tsconfigRootDir,
} = {}) {
  return defineConfig([
    ...nextVitals,
    ...nextTs,
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
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      ...additionalIgnores,
    ]),
  ]);
}

export default createRootConfig;
