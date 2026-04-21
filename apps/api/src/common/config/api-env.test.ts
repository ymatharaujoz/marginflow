import { describe, expect, it } from "vitest";
import { readApiEnv } from "./api-env";

describe("readApiEnv", () => {
  it("requires DATABASE_URL", () => {
    expect(() =>
      readApiEnv({
        API_HOST: "127.0.0.1",
        API_PORT: "4000",
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
      NODE_ENV: "test",
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    expect(env.DATABASE_URL).toContain("marginflow");
  });
});
