import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import {
  CreateAdCostRequestDto,
  CreateManualExpenseRequestDto,
  CreateProductCostRequestDto,
  UpdateAdCostRequestDto,
  UpdateManualExpenseRequestDto,
  UpdateProductCostRequestDto,
} from "./products.dto";
import { ProductsService } from "./products.service";

@Controller("costs")
@UseGuards(AuthGuard, EntitlementGuard)
export class CostsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService,
  ) {}

  @Get("products")
  async listProductCosts(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.productsService.listProductCosts(authContext.organization!.id),
      error: null,
    };
  }

  @Post("products")
  async createProductCost(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateProductCostRequestDto,
  ) {
    return {
      data: await this.productsService.createProductCost(authContext.organization!.id, body),
      error: null,
    };
  }

  @Patch("products/:id")
  async updateProductCost(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") costId: string,
    @Body() body: UpdateProductCostRequestDto,
  ) {
    return {
      data: await this.productsService.updateProductCost(authContext.organization!.id, costId, body),
      error: null,
    };
  }

  @Get("ads")
  async listAdCosts(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.productsService.listAdCosts(authContext.organization!.id),
      error: null,
    };
  }

  @Post("ads")
  async createAdCost(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateAdCostRequestDto,
  ) {
    return {
      data: await this.productsService.createAdCost(authContext.organization!.id, body),
      error: null,
    };
  }

  @Patch("ads/:id")
  async updateAdCost(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") adCostId: string,
    @Body() body: UpdateAdCostRequestDto,
  ) {
    return {
      data: await this.productsService.updateAdCost(authContext.organization!.id, adCostId, body),
      error: null,
    };
  }

  @Get("expenses")
  async listManualExpenses(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.productsService.listManualExpenses(authContext.organization!.id),
      error: null,
    };
  }

  @Post("expenses")
  async createManualExpense(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateManualExpenseRequestDto,
  ) {
    return {
      data: await this.productsService.createManualExpense(authContext.organization!.id, body),
      error: null,
    };
  }

  @Patch("expenses/:id")
  async updateManualExpense(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") expenseId: string,
    @Body() body: UpdateManualExpenseRequestDto,
  ) {
    return {
      data: await this.productsService.updateManualExpense(
        authContext.organization!.id,
        expenseId,
        body,
      ),
      error: null,
    };
  }
}
