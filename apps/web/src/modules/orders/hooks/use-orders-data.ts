"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  OrderCompositionUpdateInput,
  OrderDetails,
  OrderExportFilters,
  OrderListFilters,
  OrdersListResponse,
} from "@lucreii/types";
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

  if (filters.orderedFrom) {
    params.set("orderedFrom", filters.orderedFrom);
  }

  if (filters.orderedTo) {
    params.set("orderedTo", filters.orderedTo);
  }

  if (filters.sortBy) {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.sortDirection) {
    params.set("sortDirection", filters.sortDirection);
  }

  if (typeof filters.includeSummary === "boolean") {
    params.set("includeSummary", String(filters.includeSummary));
  }

  const path = params.size > 0 ? `/orders?${params.toString()}` : "/orders";
  return apiClient.getValidatedData(path, ordersListApiResponseSchema);
}

export async function fetchOrderDetails(orderId: string): Promise<OrderDetails> {
  return apiClient.getValidatedData(`/orders/${orderId}`, orderDetailsApiResponseSchema);
}

export async function downloadOrdersExport(
  filters: OrderExportFilters &
    Partial<Pick<OrderListFilters, "includeSummary" | "page" | "pageSize">> = {},
): Promise<Blob> {
  const params = new URLSearchParams();

  if (filters.ids && filters.ids.length > 0) {
    params.set("ids", filters.ids.join(","));
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

  if (filters.orderedFrom) {
    params.set("orderedFrom", filters.orderedFrom);
  }

  if (filters.orderedTo) {
    params.set("orderedTo", filters.orderedTo);
  }

  const path = params.size > 0 ? `/orders/export?${params.toString()}` : "/orders/export";
  return apiClient.download(path);
}

export async function updateOrderComposition(
  orderId: string,
  values: OrderCompositionUpdateInput,
): Promise<OrderDetails> {
  const response = await apiClient.patch<{ data: OrderDetails; error: null }>(
    `/orders/${orderId}/composition`,
    {
      body: values,
    },
  );

  return response.data;
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
      filters.sortBy ?? "",
      filters.sortDirection ?? "",
      filters.includeSummary ?? true,
      filters.orderedFrom ?? "",
      filters.orderedTo ?? "",
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

export function useUpdateOrderComposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      values: OrderCompositionUpdateInput;
    }) => updateOrderComposition(input.orderId, input.values),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      await queryClient.invalidateQueries({
        queryKey: [...ordersQueryKey, "detail", variables.orderId],
      });
    },
  });
}
