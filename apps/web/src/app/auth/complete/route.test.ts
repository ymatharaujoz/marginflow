import { beforeEach, describe, expect, it, vi } from "vitest";

const getWebSessionSecretMock = vi.hoisted(() => vi.fn(() => "web-session-secret"));
const createSignedWebAuthSessionMock = vi.hoisted(() => vi.fn(() => "signed-web-session"));

vi.mock("@/lib/web-auth-session", () => ({
  WEB_AUTH_SESSION_COOKIE_NAME: "lucreii.web_session",
  createSignedWebAuthSession: createSignedWebAuthSessionMock,
  getWebSessionSecret: getWebSessionSecretMock,
}));

describe("GET /auth/complete", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("redeems ticket with Railway and sets local mirrored session cookie", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://marginflow-production.up.railway.app";
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              authState: {
                onboardingStatus: "complete",
                organization: {
                  id: "org_123",
                  name: "Lucreii",
                  role: "owner",
                  slug: "lucreii",
                },
                session: {
                  expiresAt: "2026-12-31T00:00:00.000Z",
                  id: "session_123",
                },
                user: {
                  email: "owner@lucreii.local",
                  emailVerified: true,
                  id: "user_123",
                  image: null,
                  name: "Mateus",
                },
              },
              remoteSessionToken: "remote_session_token_123",
            },
            error: null,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        ),
    ) as typeof fetch;

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://marginflow-web.vercel.app/auth/complete?ticket=ticket_123&next=%2Fapp"),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://marginflow-production.up.railway.app/auth-state/exchange-ticket",
      expect.objectContaining({
        body: JSON.stringify({ ticket: "ticket_123" }),
        method: "POST",
      }),
    );
    expect(createSignedWebAuthSessionMock).toHaveBeenCalledWith(
      {
        authState: expect.objectContaining({
          session: {
            expiresAt: "2026-12-31T00:00:00.000Z",
            id: "session_123",
          },
        }),
        remoteSessionToken: "remote_session_token_123",
      },
      "web-session-secret",
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBe(
      "https://marginflow-web.vercel.app/auth/verify-session?next=%2Fapp",
    );
    expect(response.headers.get("set-cookie")).toContain("lucreii.web_session=signed-web-session");
  });
});
