import { UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "./auth.service";

describe("auth guard", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;

  beforeAll(async () => {
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "GET",
      url: "/auth-state/protected",
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns protected data when auth context is resolved", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Org",
        role: "owner",
        slug: "org",
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

    const response = await app.inject({
      method: "GET",
      url: "/auth-state/protected",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        organizationId: "org_123",
        userId: "user_123",
      },
      error: null,
    });
  });
});
