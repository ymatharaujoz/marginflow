import { afterEach, describe, expect, it, vi } from "vitest";
import { readServerAuthState } from "./server-auth";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ cookie: "better-auth.session_token=token" })),
}));

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
    vi.restoreAllMocks();
  });

  it("returns null on 401", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api";
    global.fetch = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch;

    await expect(readServerAuthState()).resolves.toBeNull();
  });

  it("returns null in soft mode when auth state request fails with 500", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://marginflow-web.vercel.app";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://marginflow-web.vercel.app/api";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = vi.fn(
      async () =>
        new Response("<html><body>upstream failure</body></html>", {
          headers: {
            "content-type": "text/html",
          },
          status: 500,
        }),
    ) as typeof fetch;

    await expect(readServerAuthState({ mode: "soft" })).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[marginflow/web] Auth state request failed in soft mode.",
      expect.objectContaining({
        endpoint: "https://marginflow-web.vercel.app/api/auth-state/me",
        status: 500,
      }),
    );
  });

  it("returns null in soft mode when auth state payload is invalid json", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://marginflow-web.vercel.app";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://marginflow-web.vercel.app/api";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = vi.fn(
      async () =>
        new Response("not-json", {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        }),
    ) as typeof fetch;

    await expect(readServerAuthState({ mode: "soft" })).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[marginflow/web] Auth state request failed in soft mode.",
      expect.objectContaining({
        endpoint: "https://marginflow-web.vercel.app/api/auth-state/me",
        status: 200,
      }),
    );
  });

  it("returns null in soft mode when auth state contract is invalid", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://marginflow-web.vercel.app";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://marginflow-web.vercel.app/api";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              user: {
                id: "user_123",
              },
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

    await expect(readServerAuthState({ mode: "soft" })).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[marginflow/web] Auth state request failed in soft mode.",
      expect.objectContaining({
        endpoint: "https://marginflow-web.vercel.app/api/auth-state/me",
        status: 200,
      }),
    );
  });

  it("parses authenticated state payload", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api";
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              onboardingStatus: "complete",
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

    await expect(readServerAuthState()).resolves.toEqual({
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
      onboardingStatus: "complete",
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
  });

  it("requests auth state through the proxied /api base on the web origin", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://marginflow-web.vercel.app";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://marginflow-web.vercel.app/api";
    const fetchSpy = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch;
    global.fetch = fetchSpy;

    await readServerAuthState();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://marginflow-web.vercel.app/api/auth-state/me",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });
});
