import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(EntitlementGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get("summary")
  async getSummary(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.dashboardService.readSummary(authContext.organization.id),
      error: null,
    };
  }

  @Get("charts")
  async getCharts(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.dashboardService.readCharts(authContext.organization.id),
      error: null,
    };
  }

  @Get("recent-sync")
  async getRecentSync(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.dashboardService.readRecentSync(authContext.organization.id),
      error: null,
    };
  }

  @Get("profitability")
  async getProfitability(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.dashboardService.readProfitability(authContext.organization.id),
      error: null,
    };
  }
}
