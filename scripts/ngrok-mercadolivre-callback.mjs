import { spawn } from "node:child_process";
import {
  buildMercadoLivreCallbackUrl,
  loadRootEnv,
  normalizeNgrokDomain,
} from "./shared-env.mjs";

const env = loadRootEnv();
const domain = normalizeNgrokDomain(env.NGROK_DOMAIN ?? "");
const port = env.API_PORT?.trim() || "4000";

if (!domain) {
  console.error("Missing NGROK_DOMAIN in the root .env files or current shell.");
  console.error("Set NGROK_DOMAIN to your reserved ngrok domain, for example my-api.ngrok.app.");
  process.exit(1);
}

const callbackUrl = buildMercadoLivreCallbackUrl(domain);

console.log(`Starting ngrok for local API port ${port}...`);
console.log(`Reserved domain: https://${domain}`);
console.log(`Mercado Livre callback URL: ${callbackUrl}`);
console.log("Keep BETTER_AUTH_URL and WEB_APP_ORIGIN on localhost for the default local flow.");

const child = spawn("ngrok", ["http", "--domain", domain, port], {
  env: {
    ...env,
    ...(env.NGROK_AUTHTOKEN ? { NGROK_AUTHTOKEN: env.NGROK_AUTHTOKEN } : {}),
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start ngrok. Make sure the ngrok agent is installed and available on PATH.");
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
