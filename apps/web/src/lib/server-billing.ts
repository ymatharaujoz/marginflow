import { headers } from "next/headers";
import { getWebEnv } from "@/lib/env";

export type ServerBillingState = {
  organizationId: string;
  entitled: boolean;
  customer: {
    externalCustomerId: string;
    id: string;
  } | null;
  subscription: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    externalSubscriptionId: string | null;
    id: string;
    interval: string;
    planCode: string;
    status: string;
  } | null;
};

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

  const payload = (await response.json()) as {
    data: ServerBillingState;
  };

  return payload.data;
}
