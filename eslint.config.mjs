import { createBaseConfig } from "@marginflow/eslint-config/base";

export default createBaseConfig({
  additionalIgnores: ["apps/**", "packages/**", ".turbo/**"],
  tsconfigRootDir: import.meta.dirname,
});
