"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@marginflow/ui";
import { authClient } from "@/lib/auth-client";
import { PUBLIC_BRAND } from "@/lib/public-branding";

type AuthErrorLike = {
  message?: string | null;
};

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function SignInPanel() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sessionState = authClient.useSession();

  useEffect(() => {
    if (!sessionState.data) return;
    router.replace("/app");
    router.refresh();
  }, [router, sessionState.data]);

  const isBusy = isSubmitting || sessionState.isPending;
  const errorMessage = useMemo(() => {
    if (message) return message;
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
      setMessage(result.error.message ?? "Não foi possível conectar com o Google. Tente de novo.");
      setIsSubmitting(false);
      return;
    }

    setMessage("Redirecionando para o Google…");
  }

  if (sessionState.data) {
    return (
      <Card className="animate-fade-in" padding="lg" variant="default">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div
            className="h-10 w-10 animate-pulse rounded-full bg-accent-soft"
            aria-hidden
          />
          <p className="text-sm font-medium text-foreground">Sessão ativa</p>
          <p className="text-sm text-muted-foreground">Redirecionando para o aplicativo…</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-[420px] animate-rise-in shadow-[var(--shadow-lg)]" padding="lg" variant="default">
      <div className="flex flex-col">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-foreground/75">
          {PUBLIC_BRAND.name}
        </p>
        <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight text-foreground md:text-[1.65rem]">
          Entrar
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          Entre com o Google para acessar sua ferramenta.
        </p>

        <div className="mt-8">
          <Button
            className="w-full !border-[#dadce0] !bg-white !font-medium !text-[#1f1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:!border-[#dadce0] hover:!bg-[#f8f9fa] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)] focus-visible:outline-[#1a73e8]"
            disabled={isBusy}
            loading={isBusy}
            onClick={handleGoogleSignIn}
            size="lg"
            variant="secondary"
          >
            <GoogleGlyph className="h-[22px] w-[22px] shrink-0" />
            Continuar com o Google
          </Button>
        </div>

        {errorMessage && (
          <div
            className="mt-5 flex gap-3 rounded-[var(--radius-md)] border border-error/25 bg-error-soft px-4 py-3 text-left text-sm text-error"
            role="alert"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Você será enviado à página segura do Google para confirmar sua identidade. Não armazenamos sua senha do
          Google.
        </p>

      </div>
    </Card>
  );
}
