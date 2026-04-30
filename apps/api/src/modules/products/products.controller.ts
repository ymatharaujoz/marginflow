import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { ProductsService } from "./products.service";
import { CreateProductRequestDto, UpdateProductRequestDto } from "./products.dto";

@Controller("products")
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(
    @Inject(ProductsService)
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  async listProducts(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.productsService.listProducts(authContext.organization.id),
      error: null,
    };
  }

  @Post()
  async createProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateProductRequestDto,
  ) {
    return {
      data: await this.productsService.createProduct(authContext.organization.id, body),
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
      data: await this.productsService.updateProduct(authContext.organization.id, productId, body),
      error: null,
    };
  }
}
