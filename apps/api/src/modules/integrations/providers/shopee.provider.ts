import type { ApiRuntimeEnv } from "@/common/config/api-env";
import {
  IntegrationProviderError,
  type IntegrationProvider,
  type IntegrationProviderAuthorization,
  type IntegrationProviderCallbackResult,
  type IntegrationProviderContext,
  type IntegrationSyncContext,
  type IntegrationSyncResult,
} from "../integrations.types";

export class ShopeeProvider implements IntegrationProvider {
  readonly displayName = "Shopee";
  readonly provider = "shopee" as const;

  constructor(env: ApiRuntimeEnv) {
    void env;
  }

  isConfigured() {
    return false;
  }

  supportsSync() {
    return false;
  }

  async createAuthorization(
    input: IntegrationProviderContext,
  ): Promise<IntegrationProviderAuthorization> {
    void input;
    throw new IntegrationProviderError(
      "Shopee connection is not configured for this environment yet.",
      "provider_not_configured",
    );
  }

  async exchangeCode(code: string): Promise<IntegrationProviderCallbackResult> {
    void code;
    throw new IntegrationProviderError(
      "Shopee connection is not configured for this environment yet.",
      "provider_not_configured",
    );
  }

  async disconnect() {
    return undefined;
  }

  async syncOrders(input: IntegrationSyncContext): Promise<IntegrationSyncResult> {
    void input;

    throw new IntegrationProviderError(
      "Shopee sync is not configured for this environment yet.",
      "provider_not_configured",
    );
  }
}
