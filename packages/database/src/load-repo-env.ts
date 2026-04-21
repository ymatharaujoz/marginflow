import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Load nearest `.env` walking up from the caller file (monorepo root or package). */
export function loadRepoEnv(importMetaUrl: string) {
  if (process.env.VITEST === "true") {
    return;
  }

  let dir = path.dirname(fileURLToPath(importMetaUrl));
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) {
      config({ path: candidate });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
}
