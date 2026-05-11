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
  CreateFixedCostRequestDto,
  ListFixedCostsQueryDto,
  UpdateFixedCostRequestDto,
} from "./finance-inputs.dto";
import { FinanceInputsService } from "./finance-inputs.service";

@Controller("fixed-costs")
@UseGuards(AuthGuard, EntitlementGuard)
export class FixedCostsController {
  constructor(
    @Inject(FinanceInputsService)
    private readonly financeInputsService: FinanceInputsService,
  ) {}

  @Get()
  async listFixedCosts(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: ListFixedCostsQueryDto,
  ) {
    return {
      data: await this.financeInputsService.listFixedCosts(
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
  async createFixedCost(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateFixedCostRequestDto,
  ) {
    return {
      data: await this.financeInputsService.createFixedCost(
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
  async updateFixedCost(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") fixedCostId: string,
    @Body() body: UpdateFixedCostRequestDto,
  ) {
    return {
      data: await this.financeInputsService.updateFixedCost(
        {
          organizationId: authContext.organization!.id,
          userId: authContext.user.id,
        },
        fixedCostId,
        body,
      ),
      error: null,
    };
  }

  @Delete(":id")
  async deleteFixedCost(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") fixedCostId: string,
  ) {
    return {
      data: await this.financeInputsService.deleteFixedCost(
        {
          organizationId: authContext.organization!.id,
          userId: authContext.user.id,
        },
        fixedCostId,
      ),
      error: null,
    };
  }
}
