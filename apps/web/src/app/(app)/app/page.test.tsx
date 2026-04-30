import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AppHomePage from "./page";

const redirectMock = vi.hoisted(() => vi.fn());
const dashboardHomeMock = vi.hoisted(() => vi.fn(() => <div>dashboard-home</div>));
const readServerAuthStateMock = vi.hoisted(() => vi.fn());
const readServerBillingStateMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/dashboard/dashboard-home", () => ({
  DashboardHome: dashboardHomeMock,
}));

vi.mock("@/lib/server-auth", () => ({
  readServerAuthState: readServerAuthStateMock,
}));

vi.mock("@/lib/server-billing", () => ({
  readServerBillingState: readServerBillingStateMock,
}));

describe("AppHomePage", () => {
  it("renders the dashboard for entitled authenticated users", async () => {
    readServerAuthStateMock.mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "MarginFlow",
        role: "owner",
        slug: "marginflow",
      },
    });
    readServerBillingStateMock.mockResolvedValueOnce({
      entitled: true,
    });

    const result = await AppHomePage();
    const markup = renderToStaticMarkup(result);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(markup).toContain("dashboard-home");
    expect(dashboardHomeMock).toHaveBeenCalled();
  });

  it("redirects non-entitled users to billing", async () => {
    readServerAuthStateMock.mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "MarginFlow",
        role: "owner",
        slug: "marginflow",
      },
    });
    readServerBillingStateMock.mockResolvedValueOnce({
      entitled: false,
    });

    await AppHomePage();

    expect(redirectMock).toHaveBeenCalledWith("/app/billing");
  });
});
