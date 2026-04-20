import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";

describe("createApiClient", () => {
  it("builds request URL from base url and path", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetchFn,
    });

    await client.get("/dashboard/summary");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:4000/dashboard/summary",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("maps non-2xx responses to ApiClientError", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetchFn: async () =>
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
    });

    await expect(client.get("/dashboard/summary")).rejects.toEqual(
      expect.objectContaining({
        name: "ApiClientError",
        message: "Unauthorized",
        payload: { message: "Unauthorized" },
        status: 401,
      }),
    );
  });
});
