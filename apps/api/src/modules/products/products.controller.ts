import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { ProductsService } from "./products.service";
import { CreateProductRequestDto, ProductAnalyticsQueryDto, UpdateProductRequestDto } from "./products.dto";

@Controller("products")
@UseGuards(AuthGuard, EntitlementGuard)
export class ProductsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  async listProducts(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.productsService.listProducts(authContext.organization!.id),
      error: null,
    };
  }

  @Get("analytics")
  async getAnalyticsSnapshot(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: ProductAnalyticsQueryDto,
  ) {
    return {
      data: await this.productsService.getAnalyticsSnapshot(
        {
          organizationId: authContext.organization!.id,
          userId: authContext.user.id,
        },
        query,
      ),
      error: null,
    };
  }

  @Post()
  async createProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateProductRequestDto,
  ) {
    return {
      data: await this.productsService.createProduct(authContext.organization!.id, body),
      error: null,
    };
  }

  @Patch(":id")
  async updateProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") productId: string,
    @Body() body: UpdateProductRequestDto,
  ) {
    return {
      data: await this.productsService.updateProduct(authContext.organization!.id, productId, body),
      error: null,
    };
  }
}
