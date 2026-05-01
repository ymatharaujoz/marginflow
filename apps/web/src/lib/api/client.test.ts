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
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("reads nested Nest error.message from API JSON errors", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "No such customer: cus_xyz",
              statusCode: 500,
            },
            path: "/billing/checkout",
            timestamp: "",
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        ),
    });

    await expect(client.post("/billing/checkout", { body: { interval: "monthly" } })).rejects.toEqual(
      expect.objectContaining({
        message: "No such customer: cus_xyz",
        status: 500,
      }),
    );
  });
});
