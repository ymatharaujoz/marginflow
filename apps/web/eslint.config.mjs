import { createRootConfig } from "../../packages/eslint-config/next.mjs";

export default createRootConfig({
  tsconfigRootDir: import.meta.dirname,
});
