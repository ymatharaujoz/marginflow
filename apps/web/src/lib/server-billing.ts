import { headers } from "next/headers";
import type { BillingState } from "@marginflow/types";
import { billingStateApiResponseSchema } from "@marginflow/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";

export type ServerBillingState = BillingState;

/**
 * Sempre consulta a API: redirecionamentos (billing vs onboarding vs app) precisam refletir
 * a assinatura real, sem fallback local na área protegida.
 */
export async function readServerBillingState(): Promise<ServerBillingState | null> {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie");
  const response = await fetch(`${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/billing/subscription`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Billing state request failed with status ${response.status}.${errorBody ? ` ${errorBody}` : ""}`,
    );
  }

  const payload = await response.json();

  return parseApiContract("/billing/subscription", payload, billingStateApiResponseSchema).data;
}
