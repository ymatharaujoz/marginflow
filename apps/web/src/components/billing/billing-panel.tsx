"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button, Card } from "@lucreii/ui";
import { BILLING_PLANS, type BillingPlanCode } from "@lucreii/types";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ServerBillingState } from "@/lib/server-billing";
import { getClientPublicEnv } from "@/lib/env";
import { getWhatsappDemoUrl } from "@/lib/site";

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

const trustFeatures = [
  { icon: ShieldIcon, label: "SSL Seguro", description: "256-bit encryption" },
  {
    icon: LockIcon,
    label: "Dados Protegidos",
    description: "PCI DSS compliant",
  },
  {
    icon: CreditCardIcon,
    label: "Pagamento Seguro",
    description: "Via Stripe",
  },
] as const;

type BillingPanelProps = {
  checkoutSessionId: string | null;
  checkoutState: string | null;
  organizationName: string;
  trialDays: number;
  trialEligible: boolean;
};

export function BillingPanel({
  checkoutSessionId,
  checkoutState,
  organizationName,
  trialDays,
  trialEligible,
}: BillingPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<{
    interval: "monthly" | "annual";
    planCode: BillingPlanCode;
  } | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const needsClientConfirm =
    checkoutState === "success" &&
    checkoutSessionId !== null &&
    checkoutSessionId.length > 0;

  type SuccessPhase = "hidden" | "expanding" | "shown" | "fading";
  const [successPhase, setSuccessPhase] = useState<SuccessPhase>(() =>
    needsClientConfirm ? "expanding" : "hidden",
  );

  const [message, setMessage] = useState<string | null>(() => {
    if (checkoutState === "success") {
      return "Checkout do Stripe concluído. A atualização do plano pode levar alguns instantes.";
    }
    if (checkoutState === "cancelled") {
      return "Checkout cancelado. Tente novamente.";
    }
    return null;
  });

  useEffect(() => {
    if (!needsClientConfirm) {
      return;
    }

    void (async () => {
      try {
        await apiClient.post<{ data: ServerBillingState; error: null }>(
          "/billing/checkout/confirm",
          { body: { sessionId: checkoutSessionId } },
        );

        // Marca fase como "shown" quando a tela já está toda verde (~1.2s)
        const shownTimer = setTimeout(() => {
          setSuccessPhase("shown");
        }, 1200);

        // Aguarda 3s na tela verde antes de iniciar fade-out
        const fadeTimer = setTimeout(() => {
          setSuccessPhase("fading");

          const navTimer = setTimeout(() => {
            router.replace("/app/onboarding");
            router.refresh();
          }, 1000); // fade-out suave de 1s

          return () => clearTimeout(navTimer);
        }, 3000);

        return () => {
          clearTimeout(shownTimer);
          clearTimeout(fadeTimer);
        };
      } catch (error) {
        const nextMessage =
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Não foi possível confirmar o checkout. Tente novamente.";
        setMessage(nextMessage);
        setSuccessPhase("hidden");
      }
    })();
  }, [checkoutSessionId, needsClientConfirm, router]);

  async function handleCheckout(
    planCode: BillingPlanCode,
    interval: "monthly" | "annual",
  ) {
    setIsSubmitting({ interval, planCode });
    setMessage(null);

    try {
      const response = await apiClient.post<{
        data: { checkoutUrl: string; sessionId: string };
        error: null;
      }>("/billing/checkout", { body: { interval, planCode } });
      window.location.assign(response.data.checkoutUrl);
    } catch (error) {
      const nextMessage =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Falha no checkout. Tente novamente.";
      setMessage(nextMessage);
      setIsSubmitting(null);
    }
  }

  const isBusy = isSubmitting !== null || successPhase !== "hidden";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      {/* Success Overlay — Expanding Circle */}
      <AnimatePresence>
        {successPhase !== "hidden" && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background"
          >
            {/* Expanding green circle — covers entire screen in 1.2s */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 1.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute aspect-square w-[250vmax] rounded-full bg-success"
            />

            {/* White checkmark — fades in after screen is green */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity:
                  successPhase === "shown" || successPhase === "fading" ? 1 : 0,
                scale:
                  successPhase === "shown" || successPhase === "fading"
                    ? 1
                    : 0.6,
              }}
              transition={{
                duration: 0.5,
                delay: successPhase === "expanding" ? 1.0 : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative z-10"
            >
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-background/15 shadow-2xl shadow-black/10 ring-1 ring-white/30 backdrop-blur-md">
                <svg
                  className="h-14 w-14 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Messages - Error/Cancel only */}
      {message && checkoutState !== "success" && (
        <motion.div
          variants={itemVariants}
          className={`mx-auto mb-8 flex max-w-3xl gap-3 rounded-xl border px-4 py-3.5 text-sm shadow-sm ${
            checkoutState === "cancelled"
              ? "border-warning/25 bg-warning/10 text-foreground"
              : "border-error/25 bg-error/10 text-foreground"
          }`}
          role="status"
        >
          {checkoutState === "cancelled" ? (
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
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
          ) : (
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <p className="leading-relaxed">{message}</p>
        </motion.div>
      )}

      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="mx-auto max-w-3xl text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
          <Badge
            variant="accent"
            className="bg-transparent text-xs font-medium uppercase tracking-wider"
          >
            Assinatura
          </Badge>
          <span className="h-1 w-1 rounded-full bg-accent" />
          <span className="text-xs text-muted-foreground">
            Escolha seu plano
          </span>
        </div>

        <h1 className="mb-4 font-[family-name:var(--font-body)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {trialEligible
            ? `Teste grátis por ${trialDays} dias`
            : "Ative sua assinatura"}
        </h1>

        <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
          {trialEligible
            ? "Cadastre seu cartão agora. A primeira cobrança acontecerá somente após o período de teste."
            : "Escolha o plano ideal para sua operação"}
        </p>
      </motion.div>

      {/* Trust Badges */}
      <motion.div
        variants={itemVariants}
        className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-6"
      >
        {trustFeatures.map((feature) => (
          <div
            key={feature.label}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
              <feature.icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {feature.label}
              </span>
              <span className="text-xs">{feature.description}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Separator */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-4xl">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </motion.div>

      {/* Features Comparison */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-10 text-center"
        >
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            O que está incluído
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
            Todos os recursos para escalar sua operação, sem limitações.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {[
            {
              name: "Workspace completo",
              description: "Gerencie todos os seus dados em um só lugar",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              ),
            },
            {
              name: "Integração com os principais marketplaces",
              description: "Sincronize pedidos e métricas automaticamente",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              ),
            },
            {
              name: "Dashboard financeiro",
              description: "Acompanhe receita, lucro e margem em tempo real",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              ),
            },
            {
              name: "Suporte por email e whatsapp",
              description: "Respostas em até 24 horas úteis",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              ),
            },
            {
              name: "Prioridade no suporte",
              description: "Atendimento prioritário com resposta rápida",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              ),
            },
            {
              name: "Exportação de relatórios",
              description: "Baixe relatórios detalhados em PDF",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              ),
            },
            {
              name: "Webhooks avançados",
              description:
                "Receba notificações em tempo real nos seus sistemas",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
                  />
                </svg>
              ),
            },
            {
              name: "API dedicada",
              description: "Integre diretamente com nossa API REST",
              icon: (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                  />
                </svg>
              ),
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    ease: [0.25, 0.1, 0.25, 1],
                  },
                },
              }}
              className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-5 shadow-sm transition-all duration-300 hover:border-accent/20 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
                {feature.icon}
              </span>
              <div className="flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {feature.name}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {feature.description}
                </span>
              </div>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Separator */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-4xl">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </motion.div>

      {/* Pricing Toggle + Card */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8 text-center"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Escolha seu plano
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Preços transparentes, sem taxas ocultas
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex flex-col items-center gap-4"
        >
          <div className="inline-flex items-center rounded-full border border-border bg-surface p-1 shadow-sm">
            {(["monthly", "annual"] as const).map((key) => {
              const active = billingCycle === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBillingCycle(key)}
                  className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full bg-accent shadow-md"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 35,
                      }}
                    />
                  )}
                  <span className="relative">
                    {key === "monthly" ? "Mensal" : "Anual"}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Single Pricing Card */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[auto_auto_1fr_auto_auto]"
        >
          {BILLING_PLANS.map((plan) => {
            const includesTrial = trialEligible && plan.code === "start";
            const loading =
              isSubmitting?.planCode === plan.code &&
              isSubmitting.interval === billingCycle;

            return (
          <motion.div
            key={plan.code}
            variants={{
              hidden: { opacity: 0, y: 30, scale: 0.95 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  duration: 0.5,
                  ease: [0.25, 0.1, 0.25, 1],
                },
              },
            }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="grid grid-rows-subgrid row-span-5"
          >
            <Card
              padding="none"
              variant="default"
              className="relative grid grid-rows-subgrid row-span-5 overflow-hidden border border-border/60 transition-colors hover:border-border"
            >
              {/* Popular Badge — only on annual */}
              <AnimatePresence>
                {plan.featured && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 right-0 top-0 z-10 flex justify-center"
                  >
                    <div className="flex items-center gap-1.5 rounded-b-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground shadow-md shadow-accent/20">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Mais popular
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-rows-subgrid row-span-5 p-6 pt-8">
                {/* Row 1: Plan Name */}
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>

                {/* Row 2: Price */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={billingCycle}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="text-4xl font-bold tracking-tight text-foreground"
                      >
                        {billingCycle === "monthly"
                          ? plan.monthlyPrice
                          : plan.annualPrice}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-muted-foreground">
                      {billingCycle === "monthly" ? "/mês" : "/ano"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {includesTrial
                      ? `Cobrança automática após ${trialDays} dias grátis`
                      : billingCycle === "monthly"
                        ? "cobrado mensalmente"
                        : "cobrado anualmente"}
                  </p>
                </div>

                {/* Row 3: Description (grows to align buttons) */}
                <p className="text-sm leading-snug text-muted-foreground">
                  {plan.description}
                </p>

                {/* Row 4: CTA */}
                <div>
                  <Button
                    className="w-full"
                    disabled={isBusy}
                    loading={loading}
                    onClick={() => void handleCheckout(plan.code, billingCycle)}
                    size="lg"
                    variant="primary"
                  >
                    {includesTrial ? "Começar teste grátis" : "Assinar"}
                  </Button>
                </div>

                {/* Row 5: Features */}
                <div className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Stripe Trust Pass */}
      <motion.div
        variants={itemVariants}
        className="mx-auto mt-10 flex justify-center"
      >
        <div className="inline-flex items-center gap-3 rounded-xl border border-border/50 bg-surface-strong/20 px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <LockIcon className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <p className="text-sm text-muted-foreground">
              Pagamento seguro pela
            </p>
            <img
              src="/icons/stripe-icon.svg"
              alt="Stripe"
              className="h-10 w-auto"
            />
          </div>
        </div>
      </motion.div>

      {/* Separator */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-4xl">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </motion.div>

      {/* FAQ / Help */}
      <motion.div
        variants={itemVariants}
        className="mx-auto mt-12 max-w-2xl pb-12 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Dúvidas sobre planos?{" "}
          <a
            href={getWhatsappDemoUrl(getClientPublicEnv()) ?? "mailto:suporte@lucreii.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            Entre em contato
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
