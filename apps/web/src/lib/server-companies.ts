import type { Company } from "@lucreii/types";
import { companiesApiResponseSchema } from "@lucreii/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";
import { buildRemoteAuthHeaders, readServerWebAuthSession } from "@/lib/server-session";

export async function readServerCompanies(): Promise<Company[]> {
  const webSession = await readServerWebAuthSession();
  if (!webSession) {
    return [];
  }

  const response = await fetch(`${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/companies`, {
    cache: "no-store",
    headers: buildRemoteAuthHeaders(webSession.remoteSessionToken),
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
