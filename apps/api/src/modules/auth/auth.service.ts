import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import {
  type DatabaseClient,
  organizationMembers,
  organizations,
} from "@marginflow/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, AUTH_INSTANCE, DATABASE_CLIENT } from "@/common/tokens";
import type { AuthenticatedRequestContext } from "./auth.types";

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
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(AUTH_INSTANCE)
    private readonly auth: BetterAuthLike,
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
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

    const membership = await this.ensureDefaultOrganization(authSession.user);

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

  async ensureDefaultOrganization(user: BetterAuthSessionResponse["user"]) {
    const existingDefaultMembership = await this.db.query.organizationMembers.findFirst({
      where: (table, { and, eq }) => and(eq(table.userId, user.id), eq(table.isDefault, true)),
      with: {
        organization: true,
      },
    });

    if (existingDefaultMembership?.organization) {
      return {
        id: existingDefaultMembership.organization.id,
        name: existingDefaultMembership.organization.name,
        role: existingDefaultMembership.role,
        slug: existingDefaultMembership.organization.slug,
      };
    }

    const existingMembership = await this.db.query.organizationMembers.findFirst({
      where: (table, { eq }) => eq(table.userId, user.id),
      with: {
        organization: true,
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    if (existingMembership?.organization) {
      return {
        id: existingMembership.organization.id,
        name: existingMembership.organization.name,
        role: existingMembership.role,
        slug: existingMembership.organization.slug,
      };
    }

    const organizationName = this.buildOrganizationName(user);
    const organizationSlug = await this.buildUniqueOrganizationSlug(user);

    const createdOrganization = await this.db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: organizationName,
          slug: organizationSlug,
        })
        .returning({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
        });

      await tx.insert(organizationMembers).values({
        isDefault: true,
        organizationId: organization.id,
        role: "owner",
        userId: user.id,
      });

      return organization;
    });

    return {
      id: createdOrganization.id,
      name: createdOrganization.name,
      role: "owner",
      slug: createdOrganization.slug,
    };
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

  private buildOrganizationName(user: BetterAuthSessionResponse["user"]) {
    const baseName = user.name?.trim() || user.email.split("@")[0];

    return `${baseName} Workspace`;
  }

  private async buildUniqueOrganizationSlug(user: BetterAuthSessionResponse["user"]) {
    const baseSlug = this.slugify(user.name?.trim() || user.email.split("@")[0] || "workspace");
    let candidate = baseSlug;

    while (true) {
      const existingOrganization = await this.db.query.organizations.findFirst({
        where: (table, { eq }) => eq(table.slug, candidate),
      });

      if (!existingOrganization) {
        return candidate;
      }

      candidate = `${baseSlug}-${randomUUID().slice(0, 8)}`;
    }
  }

  private slugify(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "workspace";
  }
}
