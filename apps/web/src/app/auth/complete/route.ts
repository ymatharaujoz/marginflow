import { NextResponse } from "next/server";
import { exchangeAuthTicketApiResponseSchema } from "@lucreii/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";
import {
  createSignedWebAuthSession,
  getWebSessionSecret,
  WEB_AUTH_SESSION_COOKIE_NAME,
} from "@/lib/web-auth-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sanitizeNextPath(input: string | null) {
  if (!input || !input.startsWith("/")) {
    return "/app";
  }

  if (input.startsWith("//")) {
    return "/app";
  }

  return input;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticket = url.searchParams.get("ticket");
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));
  const exchangeEndpoint = `${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/auth-state/exchange-ticket`;
  const signInUrl = new URL("/sign-in?auth_error=auth_handoff_failed", url);

  if (!ticket) {
    console.error("[lucreii/web] Auth completion missing ticket.", {
      nextPath,
      origin: url.origin,
      path: url.pathname,
    });
    return NextResponse.redirect(signInUrl, {
      status: 303,
    });
  }

  try {
    const response = await fetch(exchangeEndpoint, {
      body: JSON.stringify({ ticket }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      console.error("[lucreii/web] Auth exchange ticket request failed.", {
        endpoint: exchangeEndpoint,
        nextPath,
        origin: url.origin,
        path: url.pathname,
        status: response.status,
      });
      return NextResponse.redirect(signInUrl, {
        status: 303,
      });
    }

    const payload = await response.json();
    const data = parseApiContract(
      "/auth-state/exchange-ticket",
      payload,
      exchangeAuthTicketApiResponseSchema,
    ).data;
    const cookieValue = createSignedWebAuthSession(
      {
        authState: data.authState,
        remoteSessionToken: data.remoteSessionToken,
      },
      getWebSessionSecret(),
    );
    const redirectUrl = new URL("/auth/verify-session", url.origin);

    redirectUrl.searchParams.set("next", nextPath);

    const nextResponse = NextResponse.redirect(redirectUrl, {
      status: 303,
    });
    nextResponse.headers.set("Cache-Control", "no-store");

    nextResponse.cookies.set(WEB_AUTH_SESSION_COOKIE_NAME, cookieValue, {
      expires: new Date(data.authState.session.expiresAt),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: redirectUrl.protocol === "https:",
    });

    console.info("[lucreii/web] Auth exchange ticket redeemed.", {
      endpoint: exchangeEndpoint,
      nextPath,
      origin: url.origin,
      path: url.pathname,
      status: response.status,
    });

    return nextResponse;
  } catch (error) {
    console.error("[lucreii/web] Auth completion crashed while redeeming ticket.", {
      endpoint: exchangeEndpoint,
      nextPath,
      origin: url.origin,
      path: url.pathname,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.redirect(signInUrl, {
      status: 303,
    });
  }
}
