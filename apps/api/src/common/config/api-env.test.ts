import { describe, expect, it } from "vitest";
import { readApiEnv } from "./api-env";

describe("readApiEnv", () => {
  it("requires DATABASE_URL", () => {
    expect(() =>
      readApiEnv({
        API_HOST: "127.0.0.1",
        API_PORT: "4000",
        BETTER_AUTH_SECRET: "secret",
        BETTER_AUTH_URL: "http://localhost:4000",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        NODE_ENV: "test",
        WEB_APP_ORIGIN: "http://localhost:3000",
      }),
    ).toThrow();
  });

  it("requires Better Auth and Google oauth configuration", () => {
    expect(() =>
      readApiEnv({
        API_HOST: "127.0.0.1",
        API_PORT: "4000",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
        NODE_ENV: "test",
        WEB_APP_ORIGIN: "http://localhost:3000",
      }),
    ).toThrow();
  });

  it("parses DATABASE_URL when present", () => {
    const env = readApiEnv({
      API_HOST: "127.0.0.1",
      API_PORT: "4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    expect(env.DATABASE_URL).toContain("marginflow");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:4000");
  });
});
