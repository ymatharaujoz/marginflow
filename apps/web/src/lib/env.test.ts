import { afterEach, describe, expect, it, vi } from "vitest";
import { getWebEnv, readPublicEnv } from "@/lib/env";

describe("readPublicEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts complete public environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    const env = readPublicEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
    });

    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe("http://localhost:4000");
  });

  it("uses localhost defaults when vars are omitted outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const env = readPublicEnv({});

    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe("http://localhost:4000");
  });

  it("rejects missing public urls in production even when sourcing empty overrides", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => readPublicEnv({})).toThrow();
  });

  it("reads process-like sources through helper", () => {
    vi.stubEnv("NODE_ENV", "test");
    const env = getWebEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
    });

    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("accepts optional whatsapp demo url", () => {
    vi.stubEnv("NODE_ENV", "test");
    const env = readPublicEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
      NEXT_PUBLIC_WHATSAPP_DEMO_URL: "https://wa.me/5511999999999",
    });

    expect(env.NEXT_PUBLIC_WHATSAPP_DEMO_URL).toBe("https://wa.me/5511999999999");
  });

  it("rejects invalid whatsapp demo url when set", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
        NEXT_PUBLIC_WHATSAPP_DEMO_URL: "not-a-url",
      }),
    ).toThrow();
  });
});
