import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthExchangeService } from "./auth-exchange.service";
import { AuthService } from "./auth.service";

describe("auth finalize route", () => {
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

  it("creates a web auth handoff ticket after internal session cookie is present in the browser", async () => {
    const authService = app.get(AuthService);
    const authExchangeService = app.get(AuthExchangeService);

    vi.spyOn(authService, "resolveRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      session: {
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(authExchangeService, "createTicket").mockResolvedValueOnce("ticket_123");

    const response = await app.inject({
      headers: {
        cookie: "lucreii_api_session=remote_session_token_123",
      },
      method: "GET",
      url: "/auth/finalize?next=%2Fapp",
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe(
      "http://localhost:3000/auth/complete?ticket=ticket_123&next=%2Fapp",
    );
    expect(authExchangeService.createTicket).toHaveBeenCalledWith({
      organizationId: "org_123",
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
    });
  });

  it("redirects to generic auth handoff error when internal session cookie is missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/finalize?next=%2Fapp",
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe(
      "http://localhost:3000/sign-in?auth_error=auth_handoff_failed",
    );
  });
});
