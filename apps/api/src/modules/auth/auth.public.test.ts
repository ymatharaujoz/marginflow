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
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
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
    vi.spyOn(authService, "signUp").mockResolvedValueOnce({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sessionToken: "session_token_123",
    });

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
      },
      error: null,
    });
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=session_token_123");
  });

  it("sets internal session cookie on sign-in", async () => {
    const authService = app.get(AuthService);
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      expiresAt: new Date("2099-12-31T00:00:00.000Z"),
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sessionToken: "session_token_123",
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
      },
      error: null,
    });
    expect(response.headers["set-cookie"]).toContain("lucreii_api_session=session_token_123");
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
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_PRICE_ANNUAL: "price_annual",
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
