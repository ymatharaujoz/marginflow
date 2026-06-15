import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const env = {
  API_DB_POOL_MAX: 5,
  API_HOST: "127.0.0.1",
  API_PORT: 4000,
  AUTH_TRUSTED_ORIGINS: undefined,
  API_PUBLIC_BASE_URL: "http://localhost:4000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
  MERCADOLIVRE_CLIENT_ID: undefined,
  MERCADOLIVRE_CLIENT_SECRET: undefined,
  MERCADOLIVRE_REDIRECT_URI: undefined,
  STRIPE_SECRET_KEY: "stripe",
  STRIPE_WEBHOOK_SECRET: "webhook",
  STRIPE_PRICE_MONTHLY: "price_monthly",
  STRIPE_PRICE_ANNUAL: "price_annual",
  NODE_ENV: "test",
  SYNC_RELAX_GUARDS: false,
  WEB_APP_ORIGIN: "http://localhost:3000",
} as const;

function createService({
  membership = {
    id: "org_123",
    name: "Existing Org",
    role: "owner",
    slug: "existing-org",
  },
  persistedSession,
}: {
  membership?: {
    id: string;
    name: string;
    role: string;
    slug: string;
  } | null;
  persistedSession?: {
    expiresAt: Date | string;
    id: string;
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      emailVerified: boolean;
    } | null;
  } | null;
} = {}) {
  const db = {
    query: {
      sessions: {
        findFirst: vi.fn().mockResolvedValue(persistedSession ?? null),
      },
    },
  };
  const organizationProvisioningService = {
    findDefaultOrganization: vi.fn().mockResolvedValue(membership),
  };

  return {
    db,
    organizationProvisioningService,
    service: new AuthService(db as never, organizationProvisioningService as never),
  };
}

describe("AuthService", () => {
  it("returns null when api session cookie is missing", async () => {
    const { db, service } = createService();

    const context = await service.resolveRequestContext({
      headers: new Headers(),
    });

    expect(db.query.sessions.findFirst).not.toHaveBeenCalled();
    expect(context).toBeNull();
  });

  it("hydrates auth context from persisted internal session", async () => {
    const { db, organizationProvisioningService, service } = createService({
      persistedSession: {
        expiresAt: "2099-04-22T00:00:00.000Z",
        id: "session_123",
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
        cookie: "marginflow_api_session=session_token_123",
      }),
    });

    expect(db.query.sessions.findFirst).toHaveBeenCalled();
    expect(organizationProvisioningService.findDefaultOrganization).toHaveBeenCalledWith(
      "user_123",
    );
    expect(context).toEqual({
      organization: {
        id: "org_123",
        name: "Existing Org",
        role: "owner",
        slug: "existing-org",
      },
      session: {
        expiresAt: new Date("2099-04-22T00:00:00.000Z"),
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

  it("keeps authenticated users without organization during onboarding gap", async () => {
    const { service } = createService({
      membership: null,
      persistedSession: {
        expiresAt: "2099-04-22T00:00:00.000Z",
        id: "session_123",
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
        cookie: "marginflow_api_session=session_token_123",
      }),
    });

    expect(context).toEqual({
      organization: null,
      session: {
        expiresAt: new Date("2099-04-22T00:00:00.000Z"),
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
