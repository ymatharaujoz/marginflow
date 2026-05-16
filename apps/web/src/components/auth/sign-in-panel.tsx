"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@marginflow/ui";
import { authClient } from "@/lib/auth-client";
import { PUBLIC_BRAND } from "@/lib/public-branding";

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

type AuthErrorLike = {
  message?: string | null;
};

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
  }

  if (sessionState.data) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8 shadow-lg backdrop-blur-sm"
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-accent/15 ring-1 ring-accent/25" aria-hidden />
            <div className="absolute inset-0 h-12 w-12 animate-pulse rounded-full bg-accent/10" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-foreground">Sessão ativa</p>
          <p className="text-sm text-muted-foreground">Redirecionando para o aplicativo…</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-border/50 bg-surface/90 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-2xl"
    >
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-32 w-32 rounded-full bg-accent/5 blur-[60px]" />

      <div className="relative flex flex-col px-8 py-10">
        {/* Logo area */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-strong shadow-lg shadow-accent/20 ring-1 ring-white/20">
            <span className="text-xl font-bold text-white">{PUBLIC_BRAND.icon}</span>
          </div>
          <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
            {PUBLIC_BRAND.name}
          </h1>
          <p className="mt-1.5 text-center text-sm leading-relaxed text-muted-foreground">
            Entre com o Google para acessar sua ferramenta
          </p>
        </div>

        {/* Divider */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
            Continue com
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Button */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            className="group relative w-full !border-[#dadce0] !bg-white !font-semibold !text-[#1f1f1f] shadow-sm transition-all hover:!bg-[#f8f9fa] hover:shadow-md focus-visible:outline-accent/50 focus-visible:outline-offset-2"
            disabled={isBusy}
            loading={isBusy}
            onClick={handleGoogleSignIn}
            size="lg"
            variant="secondary"
          >
            <span className="flex items-center justify-center gap-3">
              <GoogleGlyph className="h-5 w-5 shrink-0 opacity-90 transition-opacity group-hover:opacity-100" />
              <span>Continuar com o Google</span>
            </span>
          </Button>
        </motion.div>

        {/* Error */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex gap-3 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-left text-sm text-error"
            role="alert"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* Info */}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/70">
          Você será enviado à página segura do Google para confirmar sua identidade.
          <br />
          Não armazenamos sua senha do Google.
        </p>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground/80"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Voltar ao site
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
