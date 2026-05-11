import { describe, expect, it, vi } from "vitest";
import { dashboardSummaryApiResponseSchema } from "@marginflow/validation";
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

  it("returns validated data when the protected response matches the schema", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            data: {
              cards: [],
              summary: {
                avgRoi: "260.00",
                avgRoas: "20.00",
                avgTicket: "200.00",
                breakEvenRevenue: "80.00",
                breakEvenUnits: "1.00",
                contributionMargin: "120.00",
                grossMarginPercent: "65.00",
                grossProfit: "130.00",
                grossRevenue: "200.00",
                netProfit: "120.00",
                netRevenue: "200.00",
                ordersCount: 1,
                totalAdCosts: "10.00",
                totalCogs: "50.00",
                totalFees: "20.00",
                totalManualExpenses: "0.00",
                totalReturns: 0,
                unitsSold: 2,
              },
            },
            error: null,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    });

    await expect(
      client.getValidatedData("/dashboard/summary", dashboardSummaryApiResponseSchema),
    ).resolves.toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          grossRevenue: "200.00",
        }),
      }),
    );
  });

  it("throws an ApiContractError when protected payload shape is invalid", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            data: {
              cards: [],
              summary: {
                grossRevenue: "200.00",
              },
            },
            error: null,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    });

    await expect(
      client.getValidatedData("/dashboard/summary", dashboardSummaryApiResponseSchema),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ApiContractError",
        path: "/dashboard/summary",
      }),
    );
  });
});
