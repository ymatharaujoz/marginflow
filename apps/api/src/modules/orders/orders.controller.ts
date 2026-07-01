import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import {
  OrderExportQueryDto,
  OrderListFiltersDto,
  UpdateOrderCompositionDto,
} from "./orders.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(AuthGuard, EntitlementGuard)
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

  @Get("export")
  async exportOrders(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: OrderExportQueryDto,
    @Res() reply: FastifyReply,
  ) {
    const buffer = await this.ordersService.exportOrdersSpreadsheet(
      {
        organizationId: authContext.organization!.id,
        selectedCompanyId: authContext.selectedCompanyId ?? null,
        userId: authContext.user.id,
      },
      query,
    );

    reply.header(
      "content-type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    reply.header(
      "content-disposition",
      `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );

    return reply.send(buffer);
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

  @Patch(":id/composition")
  async updateOrderComposition(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") id: string,
    @Body() body: UpdateOrderCompositionDto,
  ) {
    return {
      data: await this.ordersService.updateOrderComposition(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        id,
        body,
      ),
      error: null,
    };
  }
}
