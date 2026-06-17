import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthExchangeService } from "./auth-exchange.service";
import { OrganizationProvisioningService } from "./organization-provisioning.service";
import { AuthService } from "./auth.service";

describe("public auth routes", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      API_PUBLIC_BASE_URL: "http://localhost:4000",
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      NODE_ENV: "test",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("sets internal session cookie on sign-up", async () => {
    const authService = app.get(AuthService);
    const authExchangeService = app.get(AuthExchangeService);
    const organizationProvisioningService = app.get(OrganizationProvisioningService);
    vi.spyOn(authService, "signUp").mockResolvedValueOnce({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sessionToken: "session_token_123",
      userId: "550e8400-e29b-41d4-a716-446655440001",
    });
    vi.spyOn(authExchangeService, "createTicket").mockResolvedValueOnce("ticket_sign_up_123_ticket");
    vi.spyOn(organizationProvisioningService, "findDefaultOrganization").mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "POST",
      url: "/auth/sign-up",
      payload: {
        email: "owner@lucreii.local",
        name: "Mateus",
        password: "password123",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: {
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        ticket: "ticket_sign_up_123_ticket",
      },
      error: null,
    });
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=session_token_123");
  });

  it("sets internal session cookie on sign-in", async () => {
    const authService = app.get(AuthService);
    const authExchangeService = app.get(AuthExchangeService);
    const organizationProvisioningService = app.get(OrganizationProvisioningService);
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sessionToken: "session_token_123",
      userId: "user_sign_in_123",
    });
    vi.spyOn(authExchangeService, "createTicket").mockResolvedValueOnce("ticket_sign_in_123_ticket");
    vi.spyOn(organizationProvisioningService, "findDefaultOrganization").mockResolvedValueOnce({
      id: "org_sign_in_123",
      name: "Lucreii",
      role: "owner",
      slug: "lucreii",
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {
        email: "owner@lucreii.local",
        password: "password123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        ticket: "ticket_sign_in_123_ticket",
      },
      error: null,
    });
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=session_token_123");
  });

  it("sets cross-site session cookie attributes on sign-in over HTTPS", async () => {
    const authService = app.get(AuthService);
    const organizationProvisioningService = app.get(OrganizationProvisioningService);
    const authExchangeService = app.get(AuthExchangeService);
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sessionToken: "session_token_https",
      userId: "user_https_123",
    });
    vi.spyOn(organizationProvisioningService, "findDefaultOrganization").mockResolvedValueOnce(null);
    vi.spyOn(authExchangeService, "createTicket").mockResolvedValueOnce("ticket_https_123_ticket");

    const response = await app.inject({
      headers: {
        "x-forwarded-host": "marginflow-production.up.railway.app",
        "x-forwarded-proto": "https",
      },
      method: "POST",
      payload: {
        email: "owner@lucreii.local",
        password: "password123",
      },
      url: "/auth/sign-in",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=session_token_https");
    expect(response.headers["set-cookie"]).toContain("SameSite=None");
    expect(response.headers["set-cookie"]).toContain("Secure");
  });

  it("forces cross-site session cookie attributes on sign-in in production even without forwarded proto", async () => {
    await app.close();
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      API_PUBLIC_BASE_URL: "https://marginflow-production.up.railway.app",
      AUTH_TRUSTED_ORIGINS: "https://www.lucreii.com.br",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      NODE_ENV: "production",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "https://www.lucreii.com.br",
    });

    const authService = app.get(AuthService);
    const organizationProvisioningService = app.get(OrganizationProvisioningService);
    const authExchangeService = app.get(AuthExchangeService);
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sessionToken: "session_token_prod_123",
      userId: "user_prod_123",
    });
    vi.spyOn(organizationProvisioningService, "findDefaultOrganization").mockResolvedValueOnce(null);
    vi.spyOn(authExchangeService, "createTicket").mockResolvedValueOnce("ticket_prod_123_ticket");

    const response = await app.inject({
      method: "POST",
      payload: {
        email: "owner@lucreii.local",
        password: "password123",
      },
      url: "/auth/sign-in",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=session_token_prod_123");
    expect(response.headers["set-cookie"]).toContain("SameSite=None");
    expect(response.headers["set-cookie"]).toContain("Secure");
  });

  it("forces cross-site session cookie attributes on sign-up in production", async () => {
    const authService = app.get(AuthService);
    const organizationProvisioningService = app.get(OrganizationProvisioningService);
    const authExchangeService = app.get(AuthExchangeService);
    vi.spyOn(authService, "signUp").mockResolvedValueOnce({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sessionToken: "session_token_prod_signup_123",
      userId: "550e8400-e29b-41d4-a716-446655440005",
    });
    vi.spyOn(organizationProvisioningService, "findDefaultOrganization").mockResolvedValueOnce(null);
    vi.spyOn(authExchangeService, "createTicket").mockResolvedValueOnce("ticket_prod_signup_123_ticket");

    const response = await app.inject({
      method: "POST",
      payload: {
        email: "owner@lucreii.local",
        name: "Mateus",
        password: "password123",
      },
      url: "/auth/sign-up",
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=session_token_prod_signup_123");
    expect(response.headers["set-cookie"]).toContain("SameSite=None");
    expect(response.headers["set-cookie"]).toContain("Secure");
  });

  it("clears internal session cookie on sign-out", async () => {
    const authService = app.get(AuthService);
    vi.spyOn(authService, "signOut").mockResolvedValueOnce(undefined);

    const response = await app.inject({
      headers: {
        cookie: "lucreii_api_session=session_token_123",
      },
      method: "POST",
      url: "/auth/sign-out",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        success: true,
      },
      error: null,
    });
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=;");
  });

  it("forces cross-site session cookie attributes on sign-out in production", async () => {
    const authService = app.get(AuthService);
    vi.spyOn(authService, "signOut").mockResolvedValueOnce(undefined);

    const response = await app.inject({
      headers: {
        cookie: "lucreii_api_session=session_token_123",
      },
      method: "POST",
      url: "/auth/sign-out",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=;");
    expect(response.headers["set-cookie"]).toContain("SameSite=None");
    expect(response.headers["set-cookie"]).toContain("Secure");
  });

  it("redeems auth exchange ticket even when constructor metadata is unavailable", async () => {
    const originalParamTypes = Reflect.getMetadata("design:paramtypes", AuthExchangeService);
    Reflect.defineMetadata("design:paramtypes", [undefined], AuthExchangeService);

    const isolatedApp = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      API_PUBLIC_BASE_URL: "http://localhost:4000",
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      NODE_ENV: "test",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    try {
      const authExchangeService = isolatedApp.get(AuthExchangeService) as AuthExchangeService & {
        db: {
          transaction: (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
        };
      };
      const organizationProvisioningService = isolatedApp.get(OrganizationProvisioningService);

      const mockedTx = {
        query: {
          authExchangeTickets: {
            findFirst: vi.fn().mockResolvedValue({
              expiresAt: new Date("2099-01-01T00:00:00.000Z"),
              id: "exchange_123",
              remoteSessionToken: "remote_session_token_123",
              sessionId: "session_123",
              userId: "user_123",
              usedAt: null,
            }),
          },
          sessions: {
            findFirst: vi.fn().mockResolvedValue({
              expiresAt: new Date("2026-12-31T00:00:00.000Z"),
              id: "session_123",
              user: {
                email: "owner@lucreii.local",
                emailVerified: true,
                id: "user_123",
                image: null,
                name: "Mateus",
              },
            }),
          },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      };

      (
        authExchangeService as unknown as {
          db: {
            transaction: (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
          };
        }
      ).db = {
        transaction: vi.fn(async (callback) => callback(mockedTx)),
      };
      vi.spyOn(organizationProvisioningService, "findDefaultOrganization").mockResolvedValueOnce({
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      });

      const response = await isolatedApp.inject({
        method: "POST",
        payload: {
          ticket: "ticket_123_ticket_123",
        },
        url: "/auth-state/exchange-ticket",
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        data: {
          authState: {
            onboardingStatus: "complete",
            organization: {
              id: "org_123",
              name: "Lucreii",
              role: "owner",
              slug: "lucreii",
            },
            session: {
              expiresAt: "2026-12-31T00:00:00.000Z",
              id: "session_123",
            },
            user: {
              email: "owner@lucreii.local",
              emailVerified: true,
              id: "user_123",
              image: null,
              name: "Mateus",
            },
          },
          remoteSessionToken: "remote_session_token_123",
        },
        error: null,
      });
    } finally {
      if (originalParamTypes === undefined) {
        Reflect.deleteMetadata("design:paramtypes", AuthExchangeService);
      } else {
        Reflect.defineMetadata("design:paramtypes", originalParamTypes, AuthExchangeService);
      }

      await isolatedApp.close();
    }
  });
});
