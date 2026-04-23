"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@marginflow/ui";
import { authClient } from "@/lib/auth-client";

type AuthErrorLike = {
  message?: string | null;
};

export function SignInPanel() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sessionState = authClient.useSession();

  useEffect(() => {
    if (!sessionState.data) {
      return;
    }

    router.replace("/app");
    router.refresh();
  }, [router, sessionState.data]);

  const isBusy = isSubmitting || sessionState.isPending;
  const errorMessage = useMemo(() => {
    if (message) {
      return message;
    }

    return (sessionState.error as AuthErrorLike | null)?.message ?? null;
  }, [message, sessionState.error]);

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setMessage(null);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/app`,
    });

    if (result.error) {
      setMessage(result.error.message ?? "Google sign-in failed.");
      setIsSubmitting(false);
      return;
    }

    setMessage("Redirecting to Google...");
  }

  if (sessionState.data) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground-soft">Session found. Redirecting to app.</p>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Authentication</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Sign in with Google to access your workspace.
      </h1>
      <p className="mt-4 text-base leading-8 text-foreground-soft">
        MarginFlow now protects `/app` with API-owned sessions. First login creates your default
        organization automatically.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button disabled={isBusy} onClick={handleGoogleSignIn}>
          {isBusy ? "Connecting..." : "Continue with Google"}
        </Button>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[color:rgba(220,38,38,0.22)] bg-[color:rgba(220,38,38,0.08)] px-4 py-3 text-sm text-foreground">
          {errorMessage}
        </p>
      ) : null}
    </Card>
  );
}
