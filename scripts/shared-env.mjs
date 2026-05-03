import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");

function parseLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadFile(fileName, target) {
  const filePath = resolve(rootDir, fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/u)) {
    const entry = parseLine(line);

    if (!entry) {
      continue;
    }

    const [key, value] = entry;
    target[key] = value;
  }
}

export function loadRootEnv(mode = process.env.NODE_ENV ?? "development") {
  const merged = { ...process.env };

  loadFile(".env", merged);
  loadFile(".env.local", merged);

  if (mode === "development") {
    loadFile(".env.development", merged);
    loadFile(".env.development.local", merged);
  }

  return merged;
}

/** Hostname only: no scheme, no trailing slash (required for `ngrok http --domain`). */
export function normalizeNgrokDomain(domain) {
  if (!domain || typeof domain !== "string") {
    return "";
  }

  return domain.trim().replace(/^https?:\/\//u, "").replace(/\/+$/u, "");
}

export function buildMercadoLivreCallbackUrl(domain) {
  const host = normalizeNgrokDomain(domain);

  return `https://${host}/integrations/mercadolivre/callback`;
}
