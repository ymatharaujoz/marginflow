import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignedWebAuthSession } from "./web-auth-session";
import { readServerAuthState } from "./server-auth";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

const mirroredAuthState = {
  onboardingStatus: "complete" as const,
  organization: {
    id: "org_123",
    name: "Org",
    role: "owner",
    slug: "org",
  },
  session: {
    expiresAt: "2026-04-22T00:00:00.000Z",
    id: "session_123",
  },
  user: {
    email: "owner@marginflow.local",
    emailVerified: true,
    id: "user_123",
    image: null,
    name: "Mateus",
  },
};

function buildCookieValue() {
  return createSignedWebAuthSession(
    {
      authState: mirroredAuthState,
      remoteSessionToken: "remote_session_token_123",
    },
    "marginflow-web-session-dev-secret",
  );
}

describe("readServerAuthState", () => {
  const originalFetch = global.fetch;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
    if (originalApiBaseUrl) {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    cookiesMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns null when mirrored web session is missing", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => undefined),
    });

    await expect(readServerAuthState()).resolves.toBeNull();
  });

  it("returns null on 401 from Railway auth validation", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: buildCookieValue() })),
    });
    global.fetch = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch;

    await expect(readServerAuthState()).resolves.toBeNull();
  });

  it("returns mirrored auth state in soft mode when Railway auth validation fails", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://marginflow-web.vercel.app";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://marginflow-production.up.railway.app";
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: buildCookieValue() })),
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = vi.fn(async () => new Response("<html>upstream failure</html>", { status: 500 })) as typeof fetch;

    await expect(readServerAuthState({ mode: "soft" })).resolves.toEqual(mirroredAuthState);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[marginflow/web] Auth state request failed in soft mode.",
      expect.objectContaining({
        endpoint: "https://marginflow-production.up.railway.app/auth-state/me",
        status: 500,
      }),
    );
  });

  it("parses authenticated state payload from Railway using mirrored remote token", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: buildCookieValue() })),
    });
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: mirroredAuthState,
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

    await expect(readServerAuthState()).resolves.toEqual(mirroredAuthState);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/auth-state/me",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          cookie:
            "__Secure-better-auth.session_token=remote_session_token_123; better-auth.session_token=remote_session_token_123",
        },
      }),
    );
  });
});
