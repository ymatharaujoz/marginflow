import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

function loadIfExists(filePath: string, override: boolean) {
  if (existsSync(filePath)) {
    config({ path: filePath, override });
  }
}

loadIfExists(resolve(monorepoRoot, ".env"), false);
loadIfExists(resolve(monorepoRoot, ".env.local"), true);

const mode = process.env.NODE_ENV ?? "development";
if (mode === "development") {
  loadIfExists(resolve(monorepoRoot, ".env.development"), true);
  loadIfExists(resolve(monorepoRoot, ".env.development.local"), true);
}
