import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequestContext } from "./auth.types";

export const CurrentAuthContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedRequestContext => {
    const request = context.switchToHttp().getRequest<{ authContext: AuthenticatedRequestContext }>();

    return request.authContext;
  },
);
