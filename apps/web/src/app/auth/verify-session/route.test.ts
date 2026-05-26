import { beforeEach, describe, expect, it, vi } from "vitest";

const readServerWebAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({
  readServerWebAuthSession: readServerWebAuthSessionMock,
}));

vi.mock("@/lib/web-auth-session", () => ({
  WEB_AUTH_SESSION_COOKIE_NAME: "marginflow.web_session",
}));

describe("GET /auth/verify-session", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("redirects authenticated users to the requested app path", async () => {
    readServerWebAuthSessionMock.mockResolvedValueOnce({
      authState: {
        onboardingStatus: "complete",
      },
      remoteSessionToken: "remote_session_token_123",
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://marginflow-web.vercel.app/auth/verify-session?next=%2Fapp"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBe("https://marginflow-web.vercel.app/app");
  });

  it("redirects back to sign-in when the mirrored web session is missing", async () => {
    readServerWebAuthSessionMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://marginflow-web.vercel.app/auth/verify-session?next=%2Fapp"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBe(
      "https://marginflow-web.vercel.app/sign-in?auth_error=web_session_not_persisted",
    );
    expect(response.headers.get("set-cookie")).toContain("marginflow.web_session=;");
  });
});
