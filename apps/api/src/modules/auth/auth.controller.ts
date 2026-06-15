import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard } from "./auth.guard";
import { AuthExchangeService } from "./auth-exchange.service";
import { CurrentAuthContext } from "./current-auth-context";
import type { AuthenticatedRequestContext } from "./auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";

class ExchangeAuthTicketDto {
  static schema = z.object({
    ticket: z.string().trim().min(20),
  });

  ticket!: string;
}

@Controller("auth-state")
export class AuthStateController {
  constructor(
    @Inject(AuthExchangeService)
    private readonly authExchangeService: AuthExchangeService,
  ) {}

  @Get("me")
  @UseGuards(AuthGuard)
  getCurrentAuthState(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: {
        ...authContext,
        onboardingStatus: authContext.organization ? "complete" : "organization_missing",
        session: {
          ...authContext.session,
          expiresAt: authContext.session.expiresAt.toISOString(),
        },
      },
      error: null,
    };
  }

  @Get("protected")
  @UseGuards(EntitlementGuard)
  getProtectedContext(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: {
        organizationId: authContext.organization!.id,
        userId: authContext.user.id,
      },
      error: null,
    };
  }

  @Post("exchange-ticket")
  async exchangeTicket(@Body() body: ExchangeAuthTicketDto) {
    return {
      data: await this.authExchangeService.consumeTicket(body.ticket),
      error: null,
    };
  }
}
