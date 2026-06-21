import {
  BadRequestException,
  Headers,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import {
  IntegrationExternalProductParamDto,
  IntegrationProviderParamDto,
  LinkSyncedProductRequestDto,
  MercadoLivreCallbackQueryDto,
  MercadoLivreNotificationDto,
  SheinCallbackQueryDto,
  SheinNotificationDto,
  ShopeeCallbackQueryDto,
  ShopeeNotificationDto,
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
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.listConnections(
        authContext.organization!.id,
        companyId,
      ),
      error: null,
    };
  }

  @Post(":provider/connect")
  @UseGuards(EntitlementGuard)
  async createConnectUrl(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationProviderParamDto,
  ) {
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.createConnectUrl(
        authContext.organization!.id,
        companyId,
        params.provider,
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

  @Get("shopee/callback")
  async handleShopeeCallback(
    @Query() query: ShopeeCallbackQueryDto,
    @Res() reply: FastifyReply,
  ) {
    reply.status(302);
    reply.header(
      "location",
      await this.integrationsService.handleShopeeCallback(query),
    );
    return reply.send();
  }

  @Get("shein/callback")
  async handleSheinCallback(
    @Query() query: SheinCallbackQueryDto,
    @Res() reply: FastifyReply,
  ) {
    reply.status(302);
    reply.header(
      "location",
      await this.integrationsService.handleSheinCallback(query),
    );
    return reply.send();
  }

  @Post("shopee/webhook")
  async handleShopeeWebhook(
    @Body() body: ShopeeNotificationDto,
    @Headers("authorization") authorization: string | undefined,
    @Req() request: RawBodyRequest<FastifyRequest>,
  ) {
    return {
      data: await this.integrationsService.handleShopeeNotification({
        authorization: authorization ?? "",
        body,
        rawBody: request.rawBody ?? Buffer.from(JSON.stringify(body)),
      }),
      error: null,
    };
  }

  @Post("shein/webhook")
  async handleSheinWebhook(@Body() body: SheinNotificationDto) {
    return {
      data: await this.integrationsService.handleSheinNotification(body),
      error: null,
    };
  }

  @Post("mercadolivre/webhook")
  async handleMercadoLivreWebhook(@Body() body: MercadoLivreNotificationDto) {
    return {
      data: await this.integrationsService.handleMercadoLivreNotification(
        body,
        "/integrations/mercadolivre/webhook",
      ),
      error: null,
    };
  }

  @Post("mercadolivre/notifications")
  async handleMercadoLivreNotificationAlias(
    @Body() body: MercadoLivreNotificationDto,
  ) {
    return {
      data: await this.integrationsService.handleMercadoLivreNotification(
        body,
        "/integrations/mercadolivre/notifications",
      ),
      error: null,
    };
  }

  @Get(":provider/products")
  @UseGuards(EntitlementGuard)
  async listSyncedProducts(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationProviderParamDto,
  ) {
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.listSyncedProducts(
        authContext.organization!.id,
        companyId,
        params.provider,
      ),
      error: null,
    };
  }

  @Post(":provider/catalog/import")
  @UseGuards(EntitlementGuard)
  async importMarketplaceCatalog(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationProviderParamDto,
  ) {
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.importMarketplaceCatalog({
        companyId,
        organizationId: authContext.organization!.id,
        providerSlug: params.provider,
        userId: authContext.user.id,
      }),
      error: null,
    };
  }

  @Post(":provider/products/:externalProductId/import")
  @UseGuards(EntitlementGuard)
  async importSyncedProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationExternalProductParamDto,
  ) {
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.importSyncedProduct(
        authContext.organization!.id,
        companyId,
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
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.linkSyncedProduct(
        authContext.organization!.id,
        companyId,
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
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.ignoreSyncedProduct(
        authContext.organization!.id,
        companyId,
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
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.integrationsService.disconnectProvider(
        authContext.organization!.id,
        companyId,
        params.provider,
      ),
      error: null,
    };
  }

  private requireSelectedCompanyId(authContext: AuthenticatedRequestContext) {
    if (!authContext.selectedCompanyId) {
      throw new BadRequestException("Selected company required.");
    }

    return authContext.selectedCompanyId;
  }
}
