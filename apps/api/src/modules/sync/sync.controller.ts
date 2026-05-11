import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
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
    return {
      data: await this.syncService.getStatus(authContext.organization!.id, query.provider),
      error: null,
    };
  }

  @Get("history")
  async getHistory(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: SyncProviderDto,
  ) {
    return {
      data: await this.syncService.getHistory(authContext.organization!.id, query.provider),
      error: null,
    };
  }

  @Post("history/clear")
  async clearHistory(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: SyncProviderDto,
  ) {
    return {
      data: await this.syncService.clearHistory(authContext.organization!.id, body.provider),
      error: null,
    };
  }

  @Post("run")
  async runSync(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: RunSyncDto,
  ) {
    return {
      data: await this.syncService.runSync(authContext.organization!.id, body.provider),
      error: null,
    };
  }
}
