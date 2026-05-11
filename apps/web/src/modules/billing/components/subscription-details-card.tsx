"use client";

import { motion } from "framer-motion";
import { Calendar, CreditCard, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Card, Button, Badge } from "@marginflow/ui";
import { itemVariants } from "@/lib/animations";

interface SubscriptionDetailsCardProps {
  interval: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
  onManageSubscription: () => void;
  isLoadingPortal: boolean;
}

function formatInterval(interval: string): string {
  const intervals: Record<string, string> = {
    monthly: "Mensal",
    annual: "Anual",
    year: "Anual",
    month: "Mensal",
  };
  return intervals[interval] || interval;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionDetailsCard({
  interval,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  isActive,
  onManageSubscription,
  isLoadingPortal,
}: SubscriptionDetailsCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="overflow-hidden">
        {/* Header do Card */}
        <div className="border-b border-border bg-surface-strong/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Plano {formatInterval(interval)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Assinatura com cobrança automática
                </p>
              </div>
            </div>
            <Badge variant={isActive ? "success" : "secondary"}>
              {isActive ? "Ativo" : status}
            </Badge>
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="p-6">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Info de Cobrança */}
            <div className="space-y-5">
              {/* Próxima Cobrança */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-strong text-accent">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Próxima cobrança</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(currentPeriodEnd)}
                  </p>
                  {cancelAtPeriodEnd && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-md bg-warning/10 px-2 py-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <p className="text-xs text-warning">
                        Sua assinatura será cancelada ao final do período atual
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Método de Pagamento */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-strong text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Método de pagamento</p>
                  <p className="text-sm text-muted-foreground">
                    Gerenciado via Stripe
                  </p>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No portal do Stripe você pode:
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    Atualizar método de pagamento
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    Visualizar histórico de faturas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    Alterar ou cancelar plano
                  </li>
                </ul>
              </div>

              <Button
                onClick={onManageSubscription}
                loading={isLoadingPortal}
                disabled={isLoadingPortal}
                variant="primary"
                className="w-full gap-2 text-white hover:text-white [&_svg]:text-white"
              >
                Gerenciar no Stripe
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
