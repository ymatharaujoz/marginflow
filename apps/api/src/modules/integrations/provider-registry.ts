import type { ApiRuntimeEnv } from "@/common/config/api-env";
import type { IntegrationProvider } from "./integrations.types";
import { MercadoLivreProvider } from "./providers/mercadolivre.provider";
import { ShopeeProvider } from "./providers/shopee.provider";

export function createIntegrationProviders(env: ApiRuntimeEnv): IntegrationProvider[] {
  return [new MercadoLivreProvider(env), new ShopeeProvider(env)];
}
