import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");

function loadIfExists(filePath: string, override: boolean) {
  if (existsSync(filePath)) {
    config({ path: filePath, override });
  }
}

loadIfExists(resolve(apiRoot, ".env"), false);
loadIfExists(resolve(apiRoot, ".env.local"), true);

const mode = process.env.NODE_ENV ?? "development";
if (mode === "development") {
  loadIfExists(resolve(apiRoot, ".env.development"), true);
  loadIfExists(resolve(apiRoot, ".env.development.local"), true);
}
