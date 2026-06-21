import type { MarketplaceConnection } from "@lucreii/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import {
  IntegrationProviderError,
  type IntegrationCatalogImportContext,
  type IntegrationCatalogProduct,
  type IntegrationProvider,
  type IntegrationProviderAuthorization,
  type IntegrationProviderCallbackInput,
  type IntegrationProviderCallbackResult,
  type IntegrationProviderContext,
  type IntegrationSyncContext,
  type IntegrationSyncResult,
} from "../integrations.types";

export class SheinProvider implements IntegrationProvider {
  readonly displayName = "Shein";
  readonly provider = "shein" as const;

  constructor(private readonly env: ApiRuntimeEnv) {}

  isConfigured() {
    return Boolean(
      this.env.SHEIN_APP_ID &&
        this.env.SHEIN_APP_SECRET &&
        this.env.SHEIN_AUTHORIZATION_URL &&
        this.env.SHEIN_API_BASE_URL,
    );
  }

  supportsSync() {
    return this.isConfigured();
  }

  async createAuthorization(
    input: IntegrationProviderContext,
  ): Promise<IntegrationProviderAuthorization> {
    this.assertConfigured();
    const url = new URL(this.env.SHEIN_AUTHORIZATION_URL!);
    url.searchParams.set("client_id", this.env.SHEIN_APP_ID!);
    url.searchParams.set("redirect_uri", this.getRedirectUri());
    url.searchParams.set("state", input.state);
    return { authorizationUrl: url.toString() };
  }

  async exchangeCode(
    _code: string,
    input: IntegrationProviderCallbackInput = {},
  ): Promise<IntegrationProviderCallbackResult> {
    this.assertConfigured();

    if (!input.externalAccountId?.trim()) {
      throw new IntegrationProviderError(
        "Shein callback did not include the required seller_id.",
        "callback_invalid",
      );
    }

    throw new IntegrationProviderError(
      "Shein token exchange requires the private Open Platform contract details and is not wired yet.",
      "remote_request_failed",
    );
  }

  async disconnect(_connection: MarketplaceConnection | null) {
    return;
  }

  async importCatalog(
    _input: IntegrationCatalogImportContext,
  ): Promise<IntegrationCatalogProduct[]> {
    this.assertConfigured();
    throw new IntegrationProviderError(
      "Shein catalog import requires the private Open Platform contract details and is not wired yet.",
      "remote_request_failed",
    );
  }

  async syncOrders(_input: IntegrationSyncContext): Promise<IntegrationSyncResult> {
    this.assertConfigured();
    throw new IntegrationProviderError(
      "Shein order sync requires the private Open Platform contract details and is not wired yet.",
      "remote_request_failed",
    );
  }

  private getRedirectUri() {
    const apiBaseUrl =
      this.env.API_PUBLIC_BASE_URL ??
      this.env.BETTER_AUTH_URL ??
      "http://localhost:4000";
    return (
      this.env.SHEIN_REDIRECT_URI ??
      `${apiBaseUrl.replace(/\/$/, "")}/integrations/shein/callback`
    );
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new IntegrationProviderError(
        "Shein is not configured in the API environment.",
        "provider_not_configured",
      );
    }
  }
}
