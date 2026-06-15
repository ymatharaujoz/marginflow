import { createBaseConfig } from "@lucreii/eslint-config/base";

export default createBaseConfig({
  additionalIgnores: ["apps/**", "packages/**", ".turbo/**"],
  tsconfigRootDir: import.meta.dirname,
});
