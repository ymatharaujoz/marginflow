import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { CurrentAuthContext } from "./current-auth-context";
import type { AuthenticatedRequestContext } from "./auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";

@Controller("auth-state")
export class AuthStateController {
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
}
