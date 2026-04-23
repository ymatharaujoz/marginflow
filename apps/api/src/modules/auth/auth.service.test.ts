import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const env = {
  API_DB_POOL_MAX: 5,
  API_HOST: "127.0.0.1",
  API_PORT: 4000,
  AUTH_TRUSTED_ORIGINS: undefined,
  BETTER_AUTH_SECRET: "secret",
  BETTER_AUTH_URL: "http://localhost:4000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  NODE_ENV: "test",
  WEB_APP_ORIGIN: "http://localhost:3000",
} as const;

function createService({
  authSession,
  membership = {
    id: "org_123",
    name: "Existing Org",
    role: "owner",
    slug: "existing-org",
  },
}: {
  authSession?: {
    session: { id: string; expiresAt: Date };
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      emailVerified: boolean;
    };
  } | null;
  membership?: {
    id: string;
    name: string;
    role: string;
    slug: string;
  };
} = {}) {
  const auth = {
    api: {
      getSession: vi.fn().mockResolvedValue(authSession ?? null),
    },
  };
  const organizationProvisioningService = {
    ensureDefaultOrganization: vi.fn().mockResolvedValue(membership),
  };

  return {
    auth,
    organizationProvisioningService,
    service: new AuthService(auth as never, env, organizationProvisioningService as never),
  };
}

describe("AuthService", () => {
  it("returns null when Better Auth session is missing", async () => {
    const { service } = createService();

    const context = await service.resolveRequestContext({
      headers: new Headers(),
    });

    expect(context).toBeNull();
  });

  it("hydrates auth context with ensured organization scope", async () => {
    const { organizationProvisioningService, service } = createService({
      authSession: {
        session: {
          expiresAt: new Date("2026-04-22T00:00:00.000Z"),
          id: "session_123",
        },
        user: {
          email: "owner@marginflow.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
    });

    const context = await service.resolveRequestContext({
      headers: new Headers({
        cookie: "better-auth.session_token=token",
      }),
    });

    expect(organizationProvisioningService.ensureDefaultOrganization).toHaveBeenCalledWith({
      email: "owner@marginflow.local",
      emailVerified: true,
      id: "user_123",
      image: null,
      name: "Mateus",
    });
    expect(context).toEqual({
      organization: {
        id: "org_123",
        name: "Existing Org",
        role: "owner",
        slug: "existing-org",
      },
      session: {
        expiresAt: new Date("2026-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
  });
});
