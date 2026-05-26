import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AUTH_INSTANCE } from "@/common/tokens";

describe("auth oauth start route", () => {
  let app: NestFastifyApplication;

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

  it("redirects the browser to Google from a first-party API navigation", async () => {
    const auth = app.get<{ handler: (request: Request) => Promise<Response> }>(AUTH_INSTANCE);
    const handlerSpy = vi.spyOn(auth, "handler").mockResolvedValueOnce(
      new Response(JSON.stringify({ redirect: true, url: "https://accounts.google.com/o/oauth2/v2/auth" }), {
        headers: {
          "content-type": "application/json",
          "location": "https://accounts.google.com/o/oauth2/v2/auth",
          "set-cookie": "better-auth.state=signed; Path=/; HttpOnly",
        },
        status: 200,
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/auth/start/google?callbackURL=https%3A%2F%2Fmarginflow-web.vercel.app%2Fapp",
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "better-auth.state",
          value: "signed",
        }),
      ]),
    );
    expect(handlerSpy).toHaveBeenCalledOnce();
  });

  it("redirects back to the frontend sign-in page when Better Auth does not return a provider location", async () => {
    const auth = app.get<{ handler: (request: Request) => Promise<Response> }>(AUTH_INSTANCE);

    vi.spyOn(auth, "handler").mockResolvedValueOnce(
      new Response("null", {
        headers: {
          "content-type": "application/json",
        },
        status: 500,
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/auth/start/google?callbackURL=https%3A%2F%2Fmarginflow-web.vercel.app%2Fapp",
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(
      "http://localhost:3000/sign-in?auth_error=oauth_start_failed",
    );
  });
});
