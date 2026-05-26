import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRuntimeEnv } from "@/common/config/api-env";

const betterAuthSpy = vi.fn();
const drizzleAdapterSpy = vi.fn(() => "drizzle-adapter");
const dashSpy = vi.fn(() => "dash-plugin");

vi.mock("better-auth", () => ({
  betterAuth: betterAuthSpy,
}));

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: drizzleAdapterSpy,
}));

vi.mock("@better-auth/infra", () => ({
  dash: dashSpy,
}));

describe("buildBetterAuth", () => {
  beforeEach(() => {
    betterAuthSpy.mockReset();
    drizzleAdapterSpy.mockClear();
    dashSpy.mockClear();
    betterAuthSpy.mockReturnValue({ handler: vi.fn() });
  });

  it("enables trusted proxy headers and preserves trusted origins", async () => {
    const { buildBetterAuth } = await import("./better-auth.provider");
    const env = {
      API_DB_POOL_MAX: 10,
      API_HOST: "0.0.0.0",
      API_PORT: 4000,
      API_PUBLIC_BASE_URL: "https://marginflow-production.up.railway.app",
      AUTH_TRUSTED_ORIGINS: "https://marginflow-web.vercel.app",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "https://marginflow-web.vercel.app/api/auth",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      NODE_ENV: "production",
      STRIPE_PRICE_ANNUAL: "price_annual",
      STRIPE_PRICE_MONTHLY: "price_monthly",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "https://marginflow-web.vercel.app",
    } satisfies ApiRuntimeEnv;

    buildBetterAuth({} as never, env);

    expect(betterAuthSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        advanced: {
          trustedProxyHeaders: true,
        },
        basePath: "/auth",
        baseURL: "https://marginflow-web.vercel.app/api/auth",
        trustedOrigins: ["https://marginflow-web.vercel.app"],
      }),
    );
  });
});
