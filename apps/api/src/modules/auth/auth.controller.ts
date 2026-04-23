import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { CurrentAuthContext } from "./current-auth-context";
import type { AuthenticatedRequestContext } from "./auth.types";

@Controller("auth-state")
export class AuthStateController {
  @Get("me")
  @UseGuards(AuthGuard)
  getCurrentAuthState(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: authContext,
      error: null,
    };
  }

  @Get("protected")
  @UseGuards(AuthGuard)
  getProtectedContext(@CurrentAuthContext() authContext: AuthenticatedRequestContext) {
    return {
      data: {
        organizationId: authContext.organization.id,
        userId: authContext.user.id,
      },
      error: null,
    };
  }
}
