"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrderDetails, OrderListFilters, OrdersListResponse } from "@lucreii/types";
import {
  orderDetailsApiResponseSchema,
  ordersListApiResponseSchema,
} from "@lucreii/validation";
import { apiClient } from "@/lib/api/client";

export const ordersQueryKey = ["orders"] as const;

function readSelectedCompanyIdFromBrowserCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function fetchOrders(
  filters: OrderListFilters = {},
): Promise<OrdersListResponse> {
  const params = new URLSearchParams();

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.provider) {
    params.set("provider", filters.provider);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const path = params.size > 0 ? `/orders?${params.toString()}` : "/orders";
  return apiClient.getValidatedData(path, ordersListApiResponseSchema);
}

export async function fetchOrderDetails(orderId: string): Promise<OrderDetails> {
  return apiClient.getValidatedData(`/orders/${orderId}`, orderDetailsApiResponseSchema);
}

export function useOrdersList(filters: OrderListFilters = {}) {
  const selectedCompanyId = readSelectedCompanyIdFromBrowserCookie();

  return useQuery({
    queryFn: () => fetchOrders(filters),
    queryKey: [
      ...ordersQueryKey,
      selectedCompanyId,
      filters.page ?? 1,
      filters.pageSize ?? 20,
      filters.search ?? "",
      filters.provider ?? "",
      filters.status ?? "",
    ],
  });
}

export function useOrderDetails(orderId: string | null, open: boolean) {
  const selectedCompanyId = readSelectedCompanyIdFromBrowserCookie();

  return useQuery({
    enabled: open && !!orderId,
    queryFn: () => fetchOrderDetails(orderId!),
    queryKey: [...ordersQueryKey, selectedCompanyId, "detail", orderId],
  });
}
