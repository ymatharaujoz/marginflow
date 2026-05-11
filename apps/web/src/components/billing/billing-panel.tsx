"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Badge, Button, Card } from "@marginflow/ui";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ServerBillingState } from "@/lib/server-billing";
import { PUBLIC_BRAND } from "@/lib/public-branding";

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 25" fill="currentColor" aria-hidden>
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.09 10.09 0 0 1-4.56 1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02.9-.06 1.58zm-6.5-5.63c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM48.04 4.56l.04.02-.1 3.62h-.08c-1.38-.6-2.87-.83-4.32-.83-1.28 0-2.23.29-2.23 1.18 0 2.2 6.36.65 6.36 5.74 0 3.22-2.8 4.39-5.77 4.39-1.85 0-3.68-.37-5.1-1.05l.08-3.54h.1c1.42.73 3.22 1.12 4.78 1.12 1.38 0 2.46-.33 2.46-1.37 0-2.39-6.36-.75-6.36-5.67 0-3.05 2.56-4.2 5.23-4.2 1.6 0 3.16.27 4.56.77l-.02.02-.03-.17zM37.3 4.44h4.2v14.2h-4.2V4.44zm0-4.44h4.2v3.32h-4.2V0zM32.16 4.44v1.2h.04c.92-1.03 2.27-1.54 3.84-1.54.42 0 .83.04 1.23.13v3.93c-.42-.1-.88-.15-1.37-.15-1.67 0-3.26.75-3.26 2.87v8.77h-4.2V4.44h3.82zm-7.76 7.83c0-2.39-1.15-3.22-2.8-3.22-1.42 0-2.56.9-2.56 2.62 0 2.25 1.52 3.02 3.45 3.02 1.25 0 2.28-.31 2.9-.8v-1.62zm.02-7.83v8.68h-.04c-.62.52-1.79 1.04-3.52 1.04-3.47 0-6.32-2.1-6.32-6.04 0-3.71 2.64-6.2 6.03-6.2 1.52 0 2.75.44 3.47 1.08h.08V4.44h3.72v13.48c0 4.15-3.05 6.35-7.32 6.35-1.85 0-3.47-.37-4.85-1.02l.1-3.43c1.14.66 2.73 1.1 4.29 1.1 2.64 0 4.36-1.23 4.36-3.73V9.27h-.01zM11.5.18l4.26.93v3.65l-4.26-.93V.18zm0 4.56h4.26v13.9H11.5V4.74zm-4.5 0v1.2h.04c.92-1.03 2.27-1.54 3.84-1.54.42 0 .83.04 1.23.13v3.93c-.42-.1-.88-.15-1.37-.15-1.67 0-3.26.75-3.26 2.87v8.77H3.3V4.74h3.7zM0 9.13c0-3.26 2.5-4.68 5.42-4.68.56 0 1.12.06 1.67.17v3.56a5.6 5.6 0 0 0-1.5-.2c-1.33 0-2.1.5-2.1 1.63v8.84H0V9.13z" />
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

function billingPlans() {
  const monthly = PUBLIC_BRAND.priceMonthlyLabel;
  const annual = PUBLIC_BRAND.priceAnnualLabel;
  return [
    {
      badge: null,
      description: "Ideal para começar e validar o potencial da sua operação.",
      emphasized: false,
      interval: "monthly" as const,
      priceDetail: "cobrado mensalmente",
      priceLine: monthly,
      title: "Mensal",
      features: [
        "Workspace completo",
        "Integração Mercado Livre",
        "Integração Shopee",
        "Dashboard financeiro",
        "Suporte por email",
      ],
    },
    {
      badge: "Economize 20%",
      description: "Melhor custo-benefício para operações consolidadas.",
      emphasized: true,
      interval: "annual" as const,
      priceDetail: `cobrado anualmente`,
      priceLine: annual,
      title: "Anual",
      features: [
        "Tudo do plano mensal",
        "Prioridade no suporte",
        "Exportação de relatórios",
        "Webhooks avançados",
        "API dedicada",
      ],
    },
  ];
}

const trustFeatures = [
  { icon: ShieldIcon, label: "SSL Seguro", description: "256-bit encryption" },
  { icon: LockIcon, label: "Dados Protegidos", description: "PCI DSS compliant" },
  { icon: CreditCardIcon, label: "Pagamento Seguro", description: "Via Stripe" },
] as const;

type BillingPanelProps = {
  checkoutSessionId: string | null;
  checkoutState: string | null;
  organizationName: string;
};

export function BillingPanel({
  checkoutSessionId,
  checkoutState,
  organizationName,
}: BillingPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<"monthly" | "annual" | null>(null);
  const needsClientConfirm =
    checkoutState === "success" &&
    checkoutSessionId !== null &&
    checkoutSessionId.length > 0;
  const [isConfirmingCheckout, setIsConfirmingCheckout] = useState(() => needsClientConfirm);

  const [message, setMessage] = useState<string | null>(() => {
    if (checkoutState === "success") {
      if (checkoutSessionId) {
        return "Confirmando o pagamento com o servidor…";
      }
      return "Checkout do Stripe concluído. A atualização do plano pode levar alguns instantes até o webhook ser processado.";
    }
    if (checkoutState === "cancelled") {
      return "Checkout cancelado. Você pode tentar novamente nos planos abaixo.";
    }
    return null;
  });

  useEffect(() => {
    if (!needsClientConfirm) {
      setIsConfirmingCheckout(false);
      return;
    }

    setIsConfirmingCheckout(true);

    void (async () => {
      try {
        await apiClient.post<{ data: ServerBillingState; error: null }>(
          "/billing/checkout/confirm",
          { body: { sessionId: checkoutSessionId } },
        );
        setMessage("Pagamento confirmado. Redirecionando para a configuração...");
        router.replace("/app/onboarding");
        router.refresh();
      } catch (error) {
        const nextMessage =
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Não foi possível confirmar o checkout. Se o webhook ainda não rodou, aguarde um instante ou use o Stripe CLI em desenvolvimento.";
        setMessage(nextMessage);
        setIsConfirmingCheckout(false);
      }
    })();
  }, [checkoutSessionId, needsClientConfirm, router]);

  async function handleCheckout(interval: "monthly" | "annual") {
    setIsSubmitting(interval);
    setMessage(null);

    try {
      const response = await apiClient.post<{ data: { checkoutUrl: string; sessionId: string }; error: null }>(
        "/billing/checkout",
        { body: { interval } },
      );
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

  const plans = billingPlans();
  const isBusy = isSubmitting !== null || isConfirmingCheckout;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      {/* Status Messages */}
      {message && (
        <motion.div
          variants={itemVariants}
          className={`mx-auto mb-8 flex max-w-3xl gap-3 rounded-xl border px-4 py-3.5 text-sm shadow-sm ${
            checkoutState === "success"
              ? "border-success/25 bg-success/10 text-foreground"
              : checkoutState === "cancelled"
                ? "border-warning/25 bg-warning/10 text-foreground"
                : "border-error/25 bg-error/10 text-foreground"
          }`}
          role="status"
        >
          {checkoutState === "success" ? (
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : checkoutState === "cancelled" ? (
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <p className="leading-relaxed">{message}</p>
        </motion.div>
      )}

      {/* Header Section */}
      <motion.div variants={itemVariants} className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
          <Badge variant="accent" className="bg-transparent text-xs font-medium uppercase tracking-wider">
            Assinatura
          </Badge>
          <span className="h-1 w-1 rounded-full bg-accent" />
          <span className="text-xs text-muted-foreground">Escolha seu plano</span>
        </div>

        <h1 className="mb-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Ative sua assinatura
        </h1>

        <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
          Escolha o plano ideal para sua operação
        </p>
      </motion.div>

      {/* Trust Badges */}
      <motion.div
        variants={itemVariants}
        className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-6"
      >
        {trustFeatures.map((feature) => (
          <div key={feature.label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
              <feature.icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{feature.label}</span>
              <span className="text-xs">{feature.description}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Pricing Cards */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
          {plans.map((plan) => (
            <motion.div
              key={plan.interval}
              className="flex h-full min-h-0"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                padding="none"
                variant="default"
                className="relative flex h-full w-full min-h-0 flex-col overflow-hidden border border-border/60 transition-colors hover:border-border md:min-h-[26rem]"
              >
                {/* Popular Badge - Refatorado */}
                {plan.emphasized && (
                  <div className="absolute left-0 right-0 top-0 z-10 flex justify-center">
                    <div className="flex items-center gap-1.5 rounded-b-lg bg-accent px-4 py-1.5 text-xs font-medium text-white shadow-md shadow-accent/20">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Mais popular
                    </div>
                  </div>
                )}

                <div className="flex h-full flex-1 flex-col p-6 pt-8">
                  {/* Plan Header — altura mínima alinhada entre os dois cards */}
                  <div className="mb-6 min-h-[4.5rem]">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{plan.title}</h3>
                      {plan.emphasized && (
                        <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                          -20%
                        </span>
                      )}
                    </div>
                    <p className="mt-1 min-h-[3.25rem] text-sm leading-snug text-muted-foreground md:min-h-[2.75rem]">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price + linha reservada para “Economize” (alinha botões) */}
                  <div className="mb-6 min-h-[5.5rem]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-foreground">
                        {plan.priceLine}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.priceDetail}</p>
                    <div className="mt-2 flex min-h-[1.25rem] items-center">
                      {plan.emphasized ? (
                        <p className="text-xs text-success">Economize 20% no plano anual</p>
                      ) : (
                        <span className="text-xs text-transparent">-</span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full shrink-0"
                    disabled={isBusy}
                    loading={isSubmitting === plan.interval}
                    onClick={() => void handleCheckout(plan.interval)}
                    size="lg"
                    variant={plan.emphasized ? "primary" : "secondary"}
                  >
                    {plan.emphasized ? "Assinar Anual" : "Assinar Mensal"}
                  </Button>

                  {/* Features — empurra para baixo quando o card estica */}
                  <ul className="mt-auto space-y-3 border-t border-border/50 pt-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                          <CheckIcon className="h-3 w-3" />
                        </span>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stripe Trust Footer */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-2xl">
        <Card
          padding="md"
          variant="default"
          className="flex flex-col items-center gap-4 border border-border/60 bg-surface-strong/30 text-center sm:flex-row sm:gap-5 sm:text-left"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/20">
            <StripeLogo className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Cobrança via Stripe</h4>
            <p className="text-sm text-muted-foreground">
              Seus dados de pagamento são processados pelo Stripe. Não armazenamos dados de cartão.
            </p>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Aceitamos cartões de crédito, débito e métodos de pagamento locais
        </p>
      </motion.div>

      {/* FAQ / Help */}
      <motion.div variants={itemVariants} className="mx-auto mt-12 max-w-2xl text-center">
        <p className="text-sm text-muted-foreground">
          Dúvidas sobre planos?{" "}
          <a href="mailto:suporte@marginflow.com" className="font-medium text-accent hover:underline">
            Entre em contato
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
