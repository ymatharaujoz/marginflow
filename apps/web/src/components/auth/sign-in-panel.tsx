"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@lucreii/ui";
import { authClient } from "@/lib/auth-client";
import { submitPasswordAuth } from "@/lib/auth-flow";
import { getClientPublicEnv } from "@/lib/env";

type SignInPanelProps = {
  initialErrorMessage?: string | null;
};

type AuthMode = "sign-in" | "sign-up";

export function SignInPanel({ initialErrorMessage = null }: SignInPanelProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const authErrorMessage = inlineError ?? initialErrorMessage;

  function updateMode(nextMode: AuthMode) {
    setMode(nextMode);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setInlineError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setInlineError(null);

    const result =
      mode === "sign-in"
        ? await submitPasswordAuth({
            appBaseUrl: getClientPublicEnv().NEXT_PUBLIC_APP_URL,
            apiBaseUrl: getClientPublicEnv().NEXT_PUBLIC_API_BASE_URL,
            authClient,
            locationAssign: (url) => window.location.assign(url),
            mode,
            values: { email, password },
          })
        : await submitPasswordAuth({
            appBaseUrl: getClientPublicEnv().NEXT_PUBLIC_APP_URL,
            apiBaseUrl: getClientPublicEnv().NEXT_PUBLIC_API_BASE_URL,
            authClient,
            locationAssign: (url) => window.location.assign(url),
            mode,
            values: {
              email,
              name,
              password,
              confirmPassword,
            },
          });

    if (!result.success) {
      setInlineError(result.inlineError);
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-border/50 bg-surface/90 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-32 w-32 rounded-full bg-accent/5 blur-[60px]" />

      <div className="relative flex flex-col px-8 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent shadow-sm ring-1 ring-accent/20 backdrop-blur-sm"
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </motion.div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {mode === "sign-in" ? "Acesse sua conta" : "Crie sua conta"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie suas finanças com clareza e precisão.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-border/70 bg-background/60 p-1">
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mode === "sign-in"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => updateMode("sign-in")}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mode === "sign-up"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => updateMode("sign-up")}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "sign-up" && (
            <Input
              autoComplete="name"
              label="Nome"
              onChange={(event) => {
                setName(event.target.value);
                setInlineError(null);
              }}
              placeholder="Digite seu nome"
              required
              value={name}
            />
          )}

          <Input
            autoComplete="email"
            label="E-mail"
            onChange={(event) => {
              setEmail(event.target.value);
              setInlineError(null);
            }}
            placeholder="Digite seu e-mail"
            required
            type="email"
            value={email}
          />

          <Input
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            endAdornment={
              <button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
                onClick={() => setShowPassword((previous) => !previous)}
                tabIndex={-1}
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            label="Senha"
            minLength={8}
            onChange={(event) => {
              setPassword(event.target.value);
              setInlineError(null);
            }}
            placeholder="Digite sua senha"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />

          {mode === "sign-up" && (
            <Input
              autoComplete="new-password"
              endAdornment={
                <button
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
                  onClick={() => setShowPassword((previous) => !previous)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              label="Confirmar senha"
              minLength={8}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setInlineError(null);
              }}
              placeholder="Confirme sua senha"
              required
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
            />
          )}

          {authErrorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-left text-sm text-error"
              role="alert"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{authErrorMessage}</span>
            </motion.div>
          )}

          <Button className="w-full" loading={isSubmitting} size="lg" type="submit">
            {mode === "sign-in" ? "Acessar plataforma" : "Criar conta"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground/80"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Voltar ao site
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
