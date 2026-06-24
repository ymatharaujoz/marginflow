import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import "@fastify/multipart";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { ProductsService } from "./products.service";
import {
  CreateManualProductRequestDto,
  ProductCatalogExportQueryDto,
  CreateProductRequestDto,
  ProductAnalyticsQueryDto,
  UpdateProductCatalogFinanceRequestDto,
  UpdateProductRequestDto,
} from "./products.dto";

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
      data: await this.productsService.listProducts({
        organizationId: authContext.organization!.id,
        selectedCompanyId: authContext.selectedCompanyId ?? null,
        userId: authContext.user.id,
      }),
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
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        query,
      ),
      error: null,
    };
  }

  @Get("export")
  async exportProducts(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: ProductCatalogExportQueryDto,
    @Res() reply: FastifyReply,
  ) {
    const buffer = await this.productsService.exportProductsSpreadsheet(
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
      `attachment; filename="catalogo-produtos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );

    return reply.send(buffer);
  }

  @Post()
  async createProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateProductRequestDto,
  ) {
    return {
      data: await this.productsService.createProduct(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        body,
      ),
      error: null,
    };
  }

  @Post("import")
  async importProducts(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file();

    if (!data) {
      throw new BadRequestException("Nenhum arquivo enviado.");
    }

    if (
      !data.filename.toLowerCase().endsWith(".xlsx") &&
      data.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      throw new BadRequestException("Apenas arquivos .xlsx são aceitos.");
    }

    const buffer = await data.toBuffer();

    return {
      data: await this.productsService.importProducts(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        buffer,
      ),
      error: null,
    };
  }

  @Post("manual")
  async createManualProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateManualProductRequestDto,
  ) {
    return {
      data: await this.productsService.createManualProduct(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        body,
      ),
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
      data: await this.productsService.updateProduct(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        productId,
        body,
      ),
      error: null,
    };
  }

  @Patch(":id/catalog-finance")
  async updateCatalogFinance(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") productId: string,
    @Body() body: UpdateProductCatalogFinanceRequestDto,
  ) {
    return {
      data: await this.productsService.updateCatalogFinance(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        productId,
        body,
      ),
      error: null,
    };
  }

  @Delete(":id")
  async deleteProduct(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") productId: string,
  ) {
    return {
      data: await this.productsService.deleteProduct(
        {
          organizationId: authContext.organization!.id,
          selectedCompanyId: authContext.selectedCompanyId ?? null,
          userId: authContext.user.id,
        },
        productId,
      ),
      error: null,
    };
  }
}
