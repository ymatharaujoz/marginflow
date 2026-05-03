import {
  buildMercadoLivreCallbackUrl,
  loadRootEnv,
  normalizeNgrokDomain,
} from "./shared-env.mjs";

const env = loadRootEnv();
const domain = normalizeNgrokDomain(env.NGROK_DOMAIN ?? "");

if (!domain) {
  console.error("Missing NGROK_DOMAIN in the root .env files or current shell.");
  console.error("Set NGROK_DOMAIN to your reserved ngrok domain, for example my-api.ngrok.app.");
  process.exit(1);
}

console.log(buildMercadoLivreCallbackUrl(domain));
