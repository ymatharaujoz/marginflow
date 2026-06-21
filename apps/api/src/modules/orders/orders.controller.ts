import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { OrderListFiltersDto } from "./orders.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(EntitlementGuard)
export class OrdersController {
  constructor(
    @Inject(OrdersService)
    private readonly ordersService: OrdersService,
  ) {}

  @Get()
  async listOrders(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: OrderListFiltersDto,
  ) {
    return {
      data: await this.ordersService.listOrders(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        query,
      ),
      error: null,
    };
  }

  @Get(":id")
  async getOrderDetails(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") id: string,
  ) {
    return {
      data: await this.ordersService.getOrderDetails(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        id,
      ),
      error: null,
    };
  }
}
