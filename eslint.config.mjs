import { createRootConfig } from "@marginflow/eslint-config/next";

export default createRootConfig({
  additionalIgnores: ["apps/**", "packages/**", ".turbo/**"],
  tsconfigRootDir: import.meta.dirname,
});
