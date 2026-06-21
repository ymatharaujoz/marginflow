import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrdersPage from "./page";

const redirectMock = vi.hoisted(() => vi.fn());
const readServerAuthStateMock = vi.hoisted(() => vi.fn());
const readServerBillingStateMock = vi.hoisted(() => vi.fn());
const readServerCompaniesMock = vi.hoisted(() => vi.fn());
const hasActiveCompanyMock = vi.hoisted(() => vi.fn());
const getActiveCompanyMock = vi.hoisted(() => vi.fn());
const resolveProtectedAppRedirectMock = vi.hoisted(() => vi.fn());
const ordersHomeMock = vi.hoisted(() => vi.fn(() => <div>orders-home</div>));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/modules/orders", () => ({
  OrdersHome: ordersHomeMock,
}));

vi.mock("@/lib/protected-app-route", () => ({
  resolveProtectedAppRedirect: resolveProtectedAppRedirectMock,
}));

vi.mock("@/lib/server-auth", () => ({
  readServerAuthState: readServerAuthStateMock,
}));

vi.mock("@/lib/server-billing", () => ({
  readServerBillingState: readServerBillingStateMock,
}));

vi.mock("@/modules/dashboard/components/company-finance-defaults", () => ({
  getActiveCompany: getActiveCompanyMock,
}));

vi.mock("@/lib/server-companies", () => ({
  hasActiveCompany: hasActiveCompanyMock,
  readServerCompanies: readServerCompaniesMock,
}));

const activeCompanyFixture = {
  code: "MELI",
  createdAt: "2026-05-09T10:00:00.000Z",
  fixedCostDefault: "1500.00",
  id: "company_1",
  isActive: true,
  name: "Mercado Livre",
  taxRateDefault: "0.120000",
  updatedAt: "2026-05-09T10:00:00.000Z",
};

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProtectedAppRedirectMock.mockReturnValue(null);
    hasActiveCompanyMock.mockReturnValue(true);
    getActiveCompanyMock.mockReturnValue(activeCompanyFixture);
  });

  it("redirects to auto-select-company route when no company is selected", async () => {
    readServerAuthStateMock.mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      selectedCompanyId: null,
      user: {
        name: "Mateus",
      },
    });
    readServerBillingStateMock.mockResolvedValueOnce({
      entitled: true,
      status: "active",
    });
    readServerCompaniesMock.mockResolvedValueOnce([activeCompanyFixture]);

    await OrdersPage();

    expect(redirectMock).toHaveBeenCalledWith(
      "/auth/auto-select-company?companyId=company_1",
    );
    expect(ordersHomeMock).not.toHaveBeenCalled();
  });
});
