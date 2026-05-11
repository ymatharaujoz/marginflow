"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, HelpCircle } from "lucide-react";
import type { ServerBillingState } from "@/lib/server-billing";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import {
  BillingHeader,
  SubscriptionDetailsCard,
  StripeSecurityCard,
  PendingOnboardingCard,
} from "@/modules/billing";
import { AlertCircle } from "lucide-react";

interface ManageSubscriptionPanelProps {
  billingState: ServerBillingState | null;
  organizationName: string;
}

export function ManageSubscriptionPanel({
  billingState,
  organizationName,
}: ManageSubscriptionPanelProps) {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const subscription = billingState?.subscription;
  const isActive = billingState?.status === "active";
  const isPendingOnboarding = billingState?.status === "pending_onboarding";
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd ?? false;

  async function handleManageSubscription() {
    setIsLoadingPortal(true);
    setMessage(null);

    try {
      const response = await apiClient.post<{ data: { portalUrl: string }; error: null }>(
        "/billing/portal",
        {},
      );
      window.location.assign(response.data.portalUrl);
    } catch (error) {
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível abrir o portal de gerenciamento.";
      setMessage(errorMessage);
      setIsLoadingPortal(false);
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <BillingHeader
        organizationName={organizationName}
        isActive={isActive}
        isPendingOnboarding={isPendingOnboarding}
        interval={subscription?.interval}
        currentPeriodEnd={subscription?.currentPeriodEnd}
      />

      {/* Mensagem de erro */}
      {message && (
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 rounded-lg border border-error/20 bg-error/10 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          <p className="text-sm text-foreground">{message}</p>
        </motion.div>
      )}

      {/* Estado pendente de configuração */}
      {isPendingOnboarding && <PendingOnboardingCard />}

      {/* Estado ativo - Cards de gerenciamento */}
      {isActive && (
        <>
          {/* Divider com label */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              Detalhes da Assinatura
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Cards Grid */}
          <div className="grid gap-6">
            {/* Card principal da assinatura */}
            <SubscriptionDetailsCard
              interval={subscription?.interval || "monthly"}
              status={subscription?.status || "Inativo"}
              currentPeriodEnd={subscription?.currentPeriodEnd}
              cancelAtPeriodEnd={cancelAtPeriodEnd}
              isActive={isActive}
              onManageSubscription={handleManageSubscription}
              isLoadingPortal={isLoadingPortal}
            />

            {/* Card de segurança Stripe */}
            <StripeSecurityCard />
          </div>

          {/* FAQ / Ajuda */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-strong/30 px-4 py-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Precisa de ajuda?{" "}
                <a
                  href="mailto:suporte@marginflow.com"
                  className="font-medium text-accent hover:underline"
                >
                  Entre em contato com o suporte
                </a>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
