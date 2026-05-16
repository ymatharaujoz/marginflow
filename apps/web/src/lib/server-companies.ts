import { headers } from "next/headers";
import type { Company } from "@marginflow/types";
import { companiesApiResponseSchema } from "@marginflow/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";

export async function readServerCompanies(): Promise<Company[]> {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie");
  const response = await fetch(`${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/companies`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Companies request failed with status ${response.status}.${errorBody ? ` ${errorBody}` : ""}`,
    );
  }

  const payload = await response.json();

  return parseApiContract("/companies", payload, companiesApiResponseSchema).data;
}

export function hasActiveCompany(companies: Company[]) {
  return companies.some((company) => company.isActive);
}
