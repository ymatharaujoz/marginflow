import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import {
  IntegrationProviderParamDto,
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
      data: await this.integrationsService.listConnections(authContext.organization.id),
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
        authContext.organization.id,
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

  @Post(":provider/disconnect")
  @UseGuards(EntitlementGuard)
  async disconnectProvider(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param() params: IntegrationProviderParamDto,
  ) {
    return {
      data: await this.integrationsService.disconnectProvider(
        authContext.organization.id,
        params.provider,
      ),
      error: null,
    };
  }
}
