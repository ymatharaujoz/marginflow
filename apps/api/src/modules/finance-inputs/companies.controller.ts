import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { CreateCompanyRequestDto, UpdateCompanyRequestDto } from "./finance-inputs.dto";
import { FinanceInputsService } from "./finance-inputs.service";

@Controller("companies")
@UseGuards(AuthGuard, EntitlementGuard)
export class CompaniesController {
  constructor(
    @Inject(FinanceInputsService)
    private readonly financeInputsService: FinanceInputsService,
  ) {}

  @Get()
  async listCompanies(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: await this.financeInputsService.listCompanies({
        organizationId: authContext.organization!.id,
        userId: authContext.user.id,
      }),
      error: null,
    };
  }

  @Post()
  async createCompany(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateCompanyRequestDto,
  ) {
    return {
      data: await this.financeInputsService.createCompany(
        {
          organizationId: authContext.organization!.id,
          userId: authContext.user.id,
        },
        body,
      ),
      error: null,
    };
  }

  @Patch(":id")
  async updateCompany(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") companyId: string,
    @Body() body: UpdateCompanyRequestDto,
  ) {
    return {
      data: await this.financeInputsService.updateCompany(
        {
          organizationId: authContext.organization!.id,
          userId: authContext.user.id,
        },
        companyId,
        body,
      ),
      error: null,
    };
  }
}
