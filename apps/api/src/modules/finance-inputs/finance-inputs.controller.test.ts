import { UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { FinanceInputsService } from "./finance-inputs.service";

const companyId = "11111111-1111-4111-8111-111111111111";

function createAuthContext() {
  return {
    organization: {
      id: "org_123",
      name: "Org",
      role: "owner",
      slug: "org",
    },
    session: {
      expiresAt: new Date("2026-04-22T00:00:00.000Z"),
      id: "session_123",
    },
    user: {
      email: "owner@lucreii.local",
      emailVerified: true,
      id: "user_123",
      image: null,
      name: "Mateus",
    },
  };
}

describe("finance inputs controllers", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let billingService: BillingService;
  let entitlementsService: EntitlementsService;
  let financeInputsService: FinanceInputsService;

  beforeAll(async () => {
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });
    authService = app.get(AuthService);
    billingService = app.get(BillingService);
    entitlementsService = app.get(EntitlementsService);
    financeInputsService = app.get(FinanceInputsService);
    vi.spyOn(billingService, "reconcileOrganizationSubscriptionWithStripe").mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists companies for authenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "listCompanies").mockResolvedValueOnce([
      {
        code: "MELI",
        cnpj: "12345678000195",
        createdAt: "2026-05-09T10:00:00.000Z",
        fixedCostDefault: "1500.00",
        id: "company_1",
        isActive: true,
        razaoSocial: "Mercado Livre LTDA",
        taxRateDefault: "0.120000",
        updatedAt: "2026-05-09T10:00:00.000Z",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/companies",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [expect.objectContaining({ code: "MELI", id: "company_1" })],
      error: null,
    });
  });

  it("creates companies for authenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "createCompany").mockResolvedValueOnce({
      code: "MELI",
      cnpj: "12345678000195",
      createdAt: "2026-05-09T10:00:00.000Z",
      fixedCostDefault: "1500.00",
      id: "company_1",
      isActive: true,
      razaoSocial: "Mercado Livre LTDA",
      taxRateDefault: "0.120000",
      updatedAt: "2026-05-09T10:00:00.000Z",
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        cnpj: "12.345.678/0001-95",
        fixedCostDefault: "1500.00",
        isActive: true,
        razaoSocial: "Mercado Livre LTDA",
        taxRateDefault: "0.120000",
      },
      url: "/companies",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toEqual(
      expect.objectContaining({
        code: "MELI",
        cnpj: "12345678000195",
        fixedCostDefault: "1500.00",
        id: "company_1",
        razaoSocial: "Mercado Livre LTDA",
        taxRateDefault: "0.120000",
      }),
    );
  });

  it("updates companies for authenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "updateCompany").mockResolvedValueOnce({
      code: "MELI",
      cnpj: "12345678000195",
      createdAt: "2026-05-09T10:00:00.000Z",
      fixedCostDefault: "1750.00",
      id: "company_1",
      isActive: false,
      razaoSocial: "Mercado Livre LTDA",
      taxRateDefault: "0.090000",
      updatedAt: "2026-05-09T12:00:00.000Z",
    });

    const response = await app.inject({
      method: "PATCH",
      payload: {
        fixedCostDefault: "1750.00",
        isActive: false,
        taxRateDefault: "0.090000",
      },
      url: "/companies/company_1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(
      expect.objectContaining({
        fixedCostDefault: "1750.00",
        id: "company_1",
        isActive: false,
        taxRateDefault: "0.090000",
      }),
    );
  });

  it("lists monthly performance with filters", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "listPerformance").mockResolvedValueOnce([
      {
        advertisingCost: "20.00",
        channel: "mercado_livre",
        companyId,
        commissionRate: "0.14",
        createdAt: "2026-05-09T10:00:00.000Z",
        id: "perf_1",
        notes: null,
        packagingCost: "2.00",
        productName: "Produto",
        referenceMonth: "2026-05-01",
        returnsQuantity: 1,
        salePrice: "100.00",
        salesQuantity: 10,
        shippingFee: "5.00",
        sku: "SKU-1",
        unitCost: "30.00",
        updatedAt: "2026-05-09T10:00:00.000Z",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: `/performance?companyId=${companyId}&referenceMonth=2026-05-01&channel=mercado_livre&sku=SKU-1`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data[0]).toEqual(
      expect.objectContaining({
        channel: "mercado_livre",
        id: "perf_1",
      }),
    );
  });

  it("rejects invalid monthly performance payloads", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        advertisingCost: "20.00",
        channel: "m",
        commissionRate: "1.2",
        companyId,
        packagingCost: "2.00",
        productName: "Produto",
        referenceMonth: "2026-05-15",
        returnsQuantity: 11,
        salePrice: "100.00",
        salesQuantity: 10,
        shippingFee: "5.00",
        sku: "SKU-1",
        unitCost: "30.00",
      },
      url: "/performance",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBe("Request validation failed");
  });

  it("updates monthly performance rows", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "updatePerformance").mockResolvedValueOnce({
      advertisingCost: "30.00",
      channel: "mercado_livre",
      companyId,
      commissionRate: "0.14",
      createdAt: "2026-05-09T10:00:00.000Z",
      id: "perf_1",
      notes: null,
      packagingCost: "2.00",
      productName: "Produto",
      referenceMonth: "2026-05-01",
      returnsQuantity: 1,
      salePrice: "100.00",
      salesQuantity: 10,
      shippingFee: "5.00",
      sku: "SKU-1",
      unitCost: "30.00",
      updatedAt: "2026-05-09T11:00:00.000Z",
    });

    const response = await app.inject({
      method: "PATCH",
      payload: {
        advertisingCost: "30.00",
      },
      url: "/performance/perf_1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(
      expect.objectContaining({
        advertisingCost: "30.00",
        id: "perf_1",
      }),
    );
  });

  it("deletes monthly performance rows", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "deletePerformance").mockResolvedValueOnce({
      advertisingCost: "20.00",
      channel: "mercado_livre",
      companyId,
      commissionRate: "0.14",
      createdAt: "2026-05-09T10:00:00.000Z",
      id: "perf_1",
      notes: null,
      packagingCost: "2.00",
      productName: "Produto",
      referenceMonth: "2026-05-01",
      returnsQuantity: 1,
      salePrice: "100.00",
      salesQuantity: 10,
      shippingFee: "5.00",
      sku: "SKU-1",
      unitCost: "30.00",
      updatedAt: "2026-05-09T10:00:00.000Z",
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/performance/perf_1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe("perf_1");
  });

  it("lists fixed costs with filters", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "listFixedCosts").mockResolvedValueOnce([
      {
        amount: "150.00",
        category: "general",
        companyId,
        createdAt: "2026-05-09T10:00:00.000Z",
        id: "fixed_1",
        isRecurring: true,
        name: "Internet",
        notes: null,
        referenceMonth: "2026-05-01",
        updatedAt: "2026-05-09T10:00:00.000Z",
      },
    ]);

    const response = await app.inject({
      method: "GET",
      url: `/fixed-costs?companyId=${companyId}&referenceMonth=2026-05-01`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data[0]).toEqual(
      expect.objectContaining({
        id: "fixed_1",
        name: "Internet",
      }),
    );
  });

  it("creates fixed costs", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "createFixedCost").mockResolvedValueOnce({
      amount: "150.00",
      category: "general",
      companyId,
      createdAt: "2026-05-09T10:00:00.000Z",
      id: "fixed_1",
      isRecurring: true,
      name: "Internet",
      notes: null,
      referenceMonth: "2026-05-01",
      updatedAt: "2026-05-09T10:00:00.000Z",
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        amount: "150.00",
        category: "general",
        companyId,
        isRecurring: true,
        name: "Internet",
        referenceMonth: "2026-05-01",
      },
      url: "/fixed-costs",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.id).toBe("fixed_1");
  });

  it("updates fixed costs", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "updateFixedCost").mockResolvedValueOnce({
      amount: "175.00",
      category: "general",
      companyId,
      createdAt: "2026-05-09T10:00:00.000Z",
      id: "fixed_1",
      isRecurring: true,
      name: "Internet",
      notes: null,
      referenceMonth: "2026-05-01",
      updatedAt: "2026-05-09T11:00:00.000Z",
    });

    const response = await app.inject({
      method: "PATCH",
      payload: {
        amount: "175.00",
      },
      url: "/fixed-costs/fixed_1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.amount).toBe("175.00");
  });

  it("deletes fixed costs", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce(createAuthContext());
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(financeInputsService, "deleteFixedCost").mockResolvedValueOnce({
      amount: "175.00",
      category: "general",
      companyId,
      createdAt: "2026-05-09T10:00:00.000Z",
      id: "fixed_1",
      isRecurring: true,
      name: "Internet",
      notes: null,
      referenceMonth: "2026-05-01",
      updatedAt: "2026-05-09T11:00:00.000Z",
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/fixed-costs/fixed_1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe("fixed_1");
  });

  it("rejects unauthenticated finance mutations", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "DELETE",
      url: "/fixed-costs/fixed_1",
    });

    expect(response.statusCode).toBe(401);
  });
});
