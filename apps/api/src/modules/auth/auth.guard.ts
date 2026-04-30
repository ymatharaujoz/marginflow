import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      authContext?: unknown;
      raw?: { headers: Record<string, string | string[] | undefined> };
      headers: Headers | Record<string, string | string[] | undefined>;
    }>();
    const authSource = request.raw
      ? { headers: request.raw.headers }
      : request.headers instanceof Headers
        ? { headers: request.headers }
        : { headers: request.headers };
    const authContext = await this.authService.requireRequestContext(authSource);

    request.authContext = authContext;

    return true;
  }
}
