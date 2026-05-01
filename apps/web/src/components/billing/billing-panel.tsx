"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@marginflow/ui";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ServerBillingState } from "@/lib/server-billing";

const plans = [
  {
    description: "Pagamento mensal. Cancele quando quiser.",
    interval: "monthly" as const,
    title: "Mensal",
    badge: null,
  },
  {
    description: "Compromisso anual para um caminho mais enxuto de billing.",
    interval: "annual" as const,
    title: "Anual",
    badge: "Economize 20%",
  },
];

type BillingPanelProps = {
  checkoutSessionId: string | null;
  checkoutState: string | null;
  organizationName: string;
  snapshot: ServerBillingState | null;
};

function translateSubscriptionStatus(status: string): string {
  const map: Record<string, string> = {
    active: "ativo",
    inactive: "inativo",
    canceled: "cancelado",
    cancelled: "cancelado",
    past_due: "em atraso",
    trialing: "em teste",
    unpaid: "não pago",
  };
  return map[status] ?? status;
}

export function BillingPanel({
  checkoutSessionId,
  checkoutState,
  organizationName,
  snapshot,
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
      const response = await apiClient.post<{ data: { checkoutUrl: string; sessionId: string }; error: null }>("/billing/checkout", { body: { interval } });
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

  const rawStatus = snapshot?.subscription?.status ?? "inactive";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="animate-rise-in text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Assine para liberar o workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {organizationName} precisa de uma assinatura ativa para usar o MarginFlow por completo.
        </p>
      </div>

      {/* Checkout status message */}
      {message && (
        <div
          className={`rounded-[var(--radius-md)] border px-4 py-3 text-sm ${
            checkoutState === "success"
              ? "border-success/20 bg-success-soft text-foreground"
              : checkoutState === "cancelled"
                ? "border-warning/20 bg-warning-soft text-foreground"
                : "border-error/20 bg-error-soft text-foreground"
          }`}
        >
          {message}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.interval} variant="interactive" className="relative flex h-full flex-col animate-rise-in text-center">
            {plan.badge && (
              <Badge variant="accent" className="absolute right-4 top-4">
                {plan.badge}
              </Badge>
            )}
            <h2 className="text-lg font-semibold text-foreground">{plan.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            <div className="mt-auto w-full pt-6">
              <Button
                className="w-full text-white hover:text-white focus-visible:text-white"
                disabled={isSubmitting !== null || isConfirmingCheckout}
                loading={isSubmitting === plan.interval}
                onClick={() => void handleCheckout(plan.interval)}
              >
                Escolher {plan.title.toLowerCase()}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Current status */}
      <Card variant="outlined" padding="sm" className="text-center">
        <p className="text-xs text-muted-foreground">
          Status atual: <span className="font-medium text-foreground">{translateSubscriptionStatus(rawStatus)}</span>
          {" · "}
          Liberado: <span className="font-medium text-foreground">{snapshot?.entitled ? "Sim" : "Não"}</span>
        </p>
      </Card>
    </div>
  );
}
