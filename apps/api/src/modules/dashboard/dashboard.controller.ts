import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import { requireSelectedCompanyId } from "@/modules/auth/selected-company";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { DashboardService } from "./dashboard.service";

class DashboardProviderQueryDto {
  static schema = z.object({
    provider: z.enum(["mercadolivre", "shopee", "shein"]).optional(),
  });

  provider?: "mercadolivre" | "shopee" | "shein";
}

@Controller("dashboard")
@UseGuards(EntitlementGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get("summary")
  async getSummary(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readSummary(
        authContext.organization!.id,
        companyId,
        query.provider,
      ),
      error: null,
    };
  }

  @Get("charts")
  async getCharts(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readCharts(
        authContext.organization!.id,
        companyId,
        query.provider,
      ),
      error: null,
    };
  }

  @Get("recent-sync")
  async getRecentSync(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readRecentSync(
        authContext.organization!.id,
        companyId,
        query.provider,
      ),
      error: null,
    };
  }

  @Get("profitability")
  async getProfitability(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readProfitability(
        authContext.organization!.id,
        companyId,
        query.provider,
      ),
      error: null,
    };
  }
}
