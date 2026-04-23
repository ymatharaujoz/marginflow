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
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    global.fetch = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch;

    await expect(readServerAuthState()).resolves.toBeNull();
  });

  it("parses authenticated state payload", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
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
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
  });
});
