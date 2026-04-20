import { describe, expect, it } from "vitest";
import { validateClientEnv, validateServerEnv } from "@/lib/validation/env";

describe("environment validation", () => {
  it("accepts a complete server environment", () => {
    const env = validateServerEnv({
      DATABASE_URL: "https://db.example.com",
      BETTER_AUTH_SECRET: "secret",
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
    });

    expect(env.DATABASE_URL).toBe("https://db.example.com");
  });

  it("rejects missing client variables", () => {
    expect(() =>
      validateClientEnv({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_BASE_URL: undefined,
      }),
    ).toThrow();
  });
});
