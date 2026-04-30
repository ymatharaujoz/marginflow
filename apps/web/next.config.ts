import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const webRoot = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(webRoot, "..", "..");

function loadIfExists(filePath: string, override: boolean) {
  if (existsSync(filePath)) {
    loadDotenv({ path: filePath, override });
  }
}

// Next only auto-loads `.env*` under `apps/web`. Repo secrets live at the monorepo root (same as the API).
loadIfExists(resolve(monorepoRoot, ".env"), false);
loadIfExists(resolve(monorepoRoot, ".env.local"), true);
const nodeEnv = process.env.NODE_ENV ?? "development";
if (nodeEnv === "development") {
  loadIfExists(resolve(monorepoRoot, ".env.development"), true);
  loadIfExists(resolve(monorepoRoot, ".env.development.local"), true);
}

loadIfExists(resolve(webRoot, ".env"), false);
loadIfExists(resolve(webRoot, ".env.local"), true);
if (nodeEnv === "development") {
  loadIfExists(resolve(webRoot, ".env.development"), true);
  loadIfExists(resolve(webRoot, ".env.development.local"), true);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
