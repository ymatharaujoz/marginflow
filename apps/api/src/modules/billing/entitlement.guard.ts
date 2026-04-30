import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { AuthService } from "@/modules/auth/auth.service";
import { EntitlementsService } from "./entitlements.service";

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(EntitlementsService)
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      authContext?: AuthenticatedRequestContext;
      headers: Headers;
      raw?: {
        headers: Headers;
      };
    }>();

    const authContext =
      request.authContext ??
      (await this.authService.requireRequestContext(request.raw ? request.raw : request));

    request.authContext = authContext;
    await this.entitlementsService.requireActiveEntitlement(authContext.organization.id);

    return true;
  }
}
