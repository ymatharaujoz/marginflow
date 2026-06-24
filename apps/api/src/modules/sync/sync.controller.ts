import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { RunSyncDto, SyncProviderDto } from "./sync.dto";
import { SyncService } from "./sync.service";

@Controller("sync")
@UseGuards(EntitlementGuard)
export class SyncController {
  constructor(
    @Inject(SyncService)
    private readonly syncService: SyncService,
  ) {}

  @Get("status")
  async getStatus(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: SyncProviderDto,
  ) {
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.syncService.getStatus(
        authContext.organization!.id,
        companyId,
        query.provider,
      ),
      error: null,
    };
  }

  @Post("run")
  async runSync(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: RunSyncDto,
  ) {
    const companyId = this.requireSelectedCompanyId(authContext);
    return {
      data: await this.syncService.runSync(
        authContext.organization!.id,
        companyId,
        authContext.user.id,
        body.provider,
        {
          endDate: body.endDate,
          startDate: body.startDate,
        },
      ),
      error: null,
    };
  }

  private requireSelectedCompanyId(authContext: AuthenticatedRequestContext) {
    if (!authContext.selectedCompanyId) {
      throw new BadRequestException("Selected company required.");
    }

    return authContext.selectedCompanyId;
  }
}
