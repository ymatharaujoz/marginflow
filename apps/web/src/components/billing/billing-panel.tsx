"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@marginflow/ui";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ServerBillingState } from "@/lib/server-billing";
import { PUBLIC_BRAND } from "@/lib/public-branding";

function billingPlans() {
  const monthly = PUBLIC_BRAND.priceMonthlyLabel;
  const annual = PUBLIC_BRAND.priceAnnualLabel;
  return [
    {
      badge: null,
      description: "Flexível para testar o ritmo da operação. Cancele quando quiser.",
      emphasized: false,
      interval: "monthly" as const,
      priceDetail: "cobrado mensalmente",
      priceLine: monthly,
      title: "Mensal",
    },
    {
      badge: "Economize 20%",
      description: "Melhor custo para equipes que já consolidaram o uso da plataforma.",
      emphasized: true,
      interval: "annual" as const,
      priceDetail: `cobrado anualmente (equivalente a ${annual}/mês)`,
      priceLine: annual,
      title: "Anual",
    },
  ];
}

const includedFeatures = [
  "Workspace com visão financeira Mercado Livre e Shopee",
  "Sincronização manual em janelas, com histórico",
  "Indicadores de margem, lucro e custos no mesmo painel",
  "Assinatura gerenciável e cobrança segura via Stripe",
] as const;

type BillingPanelProps = {
  checkoutSessionId: string | null;
  checkoutState: string | null;
  organizationName: string;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

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
        setMessage("Assinatura atualizada. Redirecionando…");
        router.replace("/app/billing");
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
    <div className="w-full max-w-5xl space-y-10">
      {message && (
        <div
          className={`flex gap-3 rounded-[var(--radius-lg)] border px-4 py-3.5 text-sm shadow-[var(--shadow-sm)] ${
            checkoutState === "success"
              ? "border-success/25 bg-success-soft text-foreground"
              : checkoutState === "cancelled"
                ? "border-warning/25 bg-warning-soft text-foreground"
                : "border-error/25 bg-error-soft text-foreground"
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
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-10 xl:grid-cols-[1fr_minmax(0,28rem)] xl:gap-14">
        <header className="space-y-6 animate-rise-in lg:max-w-md lg:justify-self-end lg:pr-2 xl:max-w-lg xl:pr-4">
          <Badge variant="accent" className="text-[11px] font-semibold uppercase tracking-wider">
            Assinatura
          </Badge>
          <div className="space-y-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
              Ative o {PUBLIC_BRAND.name}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Escolha mensal ou anual. Após o pagamento, seu time acessa o app completo — produtos, integrações,
              painel — no mesmo workspace.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-foreground">
            {includedFeatures.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span className="leading-snug">{line}</span>
              </li>
            ))}
          </ul>
        </header>

        <div className="space-y-4">
          <h2 className="sr-only">Planos disponíveis</h2>
          <div className="grid grid-cols-1 gap-4 md:gap-5">
            {plans.map((plan) => (
              <Card
                key={plan.interval}
                padding="lg"
                variant="default"
                className={`relative flex h-full flex-col transition-shadow duration-[var(--transition-normal)] animate-rise-in ${
                  plan.emphasized
                    ? "border-accent/35 bg-surface-strong shadow-[var(--shadow-md)] ring-1 ring-accent/20"
                    : "hover:shadow-[var(--shadow-md)]"
                }`}
              >
                {plan.badge && (
                  <Badge variant="accent" className="absolute right-4 top-4 z-10">
                    {plan.badge}
                  </Badge>
                )}
                <div className="flex flex-1 flex-col">
                  <h3 className="text-lg font-semibold text-foreground">{plan.title}</h3>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {plan.priceLine}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plan.priceDetail}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                  <div className="mt-6">
                    <Button
                      className="w-full"
                      disabled={isBusy}
                      loading={isSubmitting === plan.interval}
                      onClick={() => void handleCheckout(plan.interval)}
                      size="lg"
                      variant="primary"
                    >
                      Assinar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="flex items-start gap-2 text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span>
              Cobrança e cartão são processados pelo Stripe. Você pode atualizar ou cancelar a assinatura pelo portal
              de billing quando disponível.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
