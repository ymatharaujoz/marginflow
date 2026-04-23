import { headers } from "next/headers";
import { getWebEnv } from "@/lib/env";

export type ServerAuthState = {
  session: {
    id: string;
    expiresAt: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
};

export async function readServerAuthState(): Promise<ServerAuthState | null> {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie");

  const response = await fetch(`${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/auth-state/me`, {
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
      `Auth state request failed with status ${response.status}.${errorBody ? ` ${errorBody}` : ""}`,
    );
  }

  const payload = (await response.json()) as {
    data: ServerAuthState;
  };

  return payload.data;
}
