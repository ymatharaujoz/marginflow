import type { IncomingHttpHeaders } from "node:http";
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, AUTH_INSTANCE } from "@/common/tokens";
import type { AuthenticatedRequestContext } from "./auth.types";
import { OrganizationProvisioningService } from "./organization-provisioning.service";

type BetterAuthSessionResponse = {
  session: {
    id: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
  };
};

type BetterAuthLike = {
  api: {
    getSession(input: { headers: Headers }): Promise<BetterAuthSessionResponse | null>;
  };
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_INSTANCE)
    private readonly auth: BetterAuthLike,
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
    private readonly organizationProvisioningService: OrganizationProvisioningService,
  ) {}

  getNodeHandlerBaseUrl() {
    return this.env.BETTER_AUTH_URL;
  }

  async resolveRequestContext(
    request:
      | {
          headers: IncomingHttpHeaders;
        }
      | {
          headers: Headers;
        },
  ): Promise<AuthenticatedRequestContext | null> {
    const headers = request.headers instanceof Headers ? request.headers : this.toWebHeaders(request.headers);
    const authSession = await this.auth.api.getSession({ headers });

    if (!authSession) {
      return null;
    }

    const membership = await this.organizationProvisioningService.ensureDefaultOrganization(
      authSession.user,
    );

    return {
      session: {
        expiresAt: new Date(authSession.session.expiresAt),
        id: authSession.session.id,
      },
      user: {
        email: authSession.user.email,
        emailVerified: authSession.user.emailVerified,
        id: authSession.user.id,
        image: authSession.user.image ?? null,
        name: authSession.user.name,
      },
      organization: membership,
    };
  }

  async requireRequestContext(
    request:
      | {
          headers: IncomingHttpHeaders;
        }
      | {
          headers: Headers;
        },
  ) {
    const context = await this.resolveRequestContext(request);

    if (!context) {
      throw new UnauthorizedException("Authentication required.");
    }

    if (!context.organization?.id) {
      throw new ForbiddenException("Organization membership required.");
    }

    return context;
  }
  private toWebHeaders(source: IncomingHttpHeaders) {
    const headers = new Headers();

    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          headers.append(key, entry);
        }
        continue;
      }

      if (typeof value === "string") {
        headers.set(key, value);
      }
    }

    return headers;
  }
}
