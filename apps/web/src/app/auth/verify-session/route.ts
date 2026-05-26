import { NextResponse } from "next/server";
import { readServerWebAuthSession } from "@/lib/server-session";
import { WEB_AUTH_SESSION_COOKIE_NAME } from "@/lib/web-auth-session";

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
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));
  const authSession = await readServerWebAuthSession();

  if (authSession) {
    console.info("[marginflow/web] Mirrored web session verified after OAuth handoff.", {
      nextPath,
      origin: url.origin,
      path: url.pathname,
    });

    const response = NextResponse.redirect(new URL(nextPath, url.origin), {
      status: 303,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  console.error("[marginflow/web] Mirrored web session missing after OAuth handoff.", {
    nextPath,
    origin: url.origin,
    path: url.pathname,
    reason: "web_session_not_persisted",
  });

  const response = NextResponse.redirect(
    new URL("/sign-in?auth_error=web_session_not_persisted", url.origin),
    {
      status: 303,
    },
  );
  response.headers.set("Cache-Control", "no-store");
  response.cookies.delete(WEB_AUTH_SESSION_COOKIE_NAME);
  return response;
}
