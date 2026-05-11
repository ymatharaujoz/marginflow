import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import {
  CreatePerformanceRequestDto,
  ListPerformanceQueryDto,
  UpdatePerformanceRequestDto,
} from "./finance-inputs.dto";
import { FinanceInputsService } from "./finance-inputs.service";

@Controller("performance")
@UseGuards(AuthGuard, EntitlementGuard)
export class PerformanceController {
  constructor(
    @Inject(FinanceInputsService)
    private readonly financeInputsService: FinanceInputsService,
  ) {}

  @Get()
  async listPerformance(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: ListPerformanceQueryDto,
  ) {
    return {
      data: await this.financeInputsService.listPerformance(
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
  async createPerformance(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreatePerformanceRequestDto,
  ) {
    return {
      data: await this.financeInputsService.createPerformance(
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
  async updatePerformance(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") performanceId: string,
    @Body() body: UpdatePerformanceRequestDto,
  ) {
    return {
      data: await this.financeInputsService.updatePerformance(
        {
          organizationId: authContext.organization!.id,
          userId: authContext.user.id,
        },
        performanceId,
        body,
      ),
      error: null,
    };
  }

  @Delete(":id")
  async deletePerformance(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") performanceId: string,
  ) {
    return {
      data: await this.financeInputsService.deletePerformance(
        {
          organizationId: authContext.organization!.id,
          userId: authContext.user.id,
        },
        performanceId,
      ),
      error: null,
    };
  }
}
