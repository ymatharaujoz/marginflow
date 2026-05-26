import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientPublicEnv, getWebEnv, readPublicEnv, resetPublicEnvDiagnosticsForTests } from "@/lib/env";

describe("readPublicEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetPublicEnvDiagnosticsForTests();
  });

  it("accepts complete public environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    const env = readPublicEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
    });

    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe("http://localhost:4000");
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("MarginFlow");
    expect(env.NEXT_PUBLIC_APP_ICON).toBe("M");
    expect(env.NEXT_PUBLIC_PRICE_MONTHLY_LABEL).toBe("R$ 99");
    expect(env.NEXT_PUBLIC_PRICE_ANNUAL_LABEL).toBe("R$ 79");
  });

  it("uses localhost defaults when vars are omitted outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const env = readPublicEnv({});

    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe("http://localhost:4000");
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("MarginFlow");
    expect(env.NEXT_PUBLIC_PRICE_MONTHLY_LABEL).toBe("R$ 99");
  });

  it("reads custom branding and price labels when set", () => {
    vi.stubEnv("NODE_ENV", "test");
    const env = readPublicEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
      NEXT_PUBLIC_APP_NAME: "Acme",
      NEXT_PUBLIC_APP_ICON: "A",
      NEXT_PUBLIC_PRICE_MONTHLY_LABEL: "R$ 50",
      NEXT_PUBLIC_PRICE_ANNUAL_LABEL: "R$ 40",
    });

    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Acme");
    expect(env.NEXT_PUBLIC_APP_ICON).toBe("A");
    expect(env.NEXT_PUBLIC_PRICE_MONTHLY_LABEL).toBe("R$ 50");
    expect(env.NEXT_PUBLIC_PRICE_ANNUAL_LABEL).toBe("R$ 40");
  });

  it("rejects missing public urls in production even when sourcing empty overrides", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => readPublicEnv({})).toThrow(
      "Invalid public environment configuration. Missing: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_BASE_URL. Configure them in Vercel Project Settings > Environment Variables for the active environment and redeploy.",
    );
  });

  it("reads process-like sources through helper", () => {
    vi.stubEnv("NODE_ENV", "test");
    const env = getWebEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
    });

    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("reads client public env from direct NEXT_PUBLIC process access", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://marginflow-web-qn8b.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://marginflow-production.up.railway.app");

    const env = getClientPublicEnv();

    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://marginflow-web-qn8b.vercel.app");
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe("https://marginflow-production.up.railway.app");
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

  it("logs a server-side diagnostic once when production public urls are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "marginflow-web.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "marginflow-web.vercel.app");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => readPublicEnv({})).toThrow(
      "Invalid public environment configuration. Missing: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_BASE_URL. Configure them in Vercel Project Settings > Environment Variables for the active environment and redeploy.",
    );
    expect(() => readPublicEnv({})).toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[marginflow/web] Missing required public environment variables in production.",
      expect.objectContaining({
        missingKeys: ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_API_BASE_URL"],
        nodeEnv: "production",
        vercelEnv: "production",
        vercelProjectProductionUrl: "marginflow-web.vercel.app",
        vercelUrl: "marginflow-web.vercel.app",
        NEXT_PUBLIC_API_BASE_URL: false,
        NEXT_PUBLIC_APP_URL: false,
      }),
    );
  });
});
