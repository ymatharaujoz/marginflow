import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import {
  IntegrationExternalProductParamDto,
  IntegrationProviderParamDto,
  LinkSyncedProductRequestDto,
  MercadoLivreCallbackQueryDto,
} from "./integrations.dto";
import { IntegrationsService } from "./integrations.service";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    @Inject(IntegrationsService)
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get()
  @UseGuards(EntitlementGuard)
  async listConnections(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
  ) {
    return {
      data: await this.integrationsService.listConnections(authContext.organization!.id),
      error: null,
    };
  }

  @Post("mercadolivre/connect")
  @UseGuards(EntitlementGuard)
  async createMercadoLivreConnectUrl(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
  ) {
    return {
      data: await this.integrationsService.createConnectUrl(
        authContext.organization!.id,
        "mercadolivre",
      ),
      error: null,
    };
  }

  @Get("mercadolivre/callback")
  async handleMercadoLivreCallback(
    @Query() query: MercadoLivreCallbackQueryDto,
    @Res() reply: FastifyReply,
  ) {
    reply.status(302);
    reply.header(
      "location",
      await this.integrationsService.handleMercadoLivreCallback(query),
    );

    return reply.send();
  }

  @Get(":provider/products")
  @UseGuards(EntitlementGuard)
  async listSyncedProducts(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationProviderParamDto,
  ) {
    return {
      data: await this.integrationsService.listSyncedProducts(
        authContext.organization!.id,
        params.provider,
      ),
      error: null,
    };
  }

  @Post(":provider/products/:externalProductId/import")
  @UseGuards(EntitlementGuard)
  async importSyncedProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationExternalProductParamDto,
  ) {
    return {
      data: await this.integrationsService.importSyncedProduct(
        authContext.organization!.id,
        params.provider,
        params.externalProductId,
      ),
      error: null,
    };
  }

  @Post(":provider/products/:externalProductId/link")
  @UseGuards(EntitlementGuard)
  async linkSyncedProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationExternalProductParamDto,
    @Body() body: LinkSyncedProductRequestDto,
  ) {
    return {
      data: await this.integrationsService.linkSyncedProduct(
        authContext.organization!.id,
        params.provider,
        params.externalProductId,
        body.productId,
      ),
      error: null,
    };
  }

  @Post(":provider/products/:externalProductId/ignore")
  @UseGuards(EntitlementGuard)
  async ignoreSyncedProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationExternalProductParamDto,
  ) {
    return {
      data: await this.integrationsService.ignoreSyncedProduct(
        authContext.organization!.id,
        params.provider,
        params.externalProductId,
      ),
      error: null,
    };
  }

  @Post(":provider/disconnect")
  @UseGuards(EntitlementGuard)
  async disconnectProvider(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationProviderParamDto,
  ) {
    return {
      data: await this.integrationsService.disconnectProvider(
        authContext.organization!.id,
        params.provider,
      ),
      error: null,
    };
  }
}
