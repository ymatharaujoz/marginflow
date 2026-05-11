"use client";

import { motion } from "framer-motion";
import { CreditCard, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@marginflow/ui";
import { fadeInVariants } from "@/lib/animations";

interface BillingHeaderProps {
  organizationName: string;
  isActive: boolean;
  isPendingOnboarding: boolean;
  interval?: string;
  currentPeriodEnd?: string | null;
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

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BillingHeader({
  organizationName,
  isActive,
  isPendingOnboarding,
  interval,
  currentPeriodEnd,
}: BillingHeaderProps) {
  const getStatusBadge = () => {
    if (isPendingOnboarding) {
      return (
        <Badge variant="warning" className="shrink-0 gap-1.5">
          <AlertCircle className="h-3 w-3" />
          Configuração Pendente
        </Badge>
      );
    }
    if (isActive) {
      return (
        <Badge variant="success" className="shrink-0 gap-1.5">
          <CreditCard className="h-3 w-3" />
          Ativo
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" className="shrink-0 gap-1.5">
        <AlertCircle className="h-3 w-3" />
        Inativo
      </Badge>
    );
  };

  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Título e Subtítulo */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h1 className="m-0 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              Assinatura
            </h1>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie o plano de <span className="font-medium text-foreground">{organizationName}</span>
            {!isPendingOnboarding && interval && (
              <>
                {" — "}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Próxima cobrança: {" "}
                  <span className="font-medium text-foreground">{formatDate(currentPeriodEnd)}</span>
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Barra de info com badges */}
      {!isPendingOnboarding && isActive && (
        <div className="flex flex-wrap items-center gap-2 border-y border-border py-4">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            <CreditCard className="h-3.5 w-3.5" />
            Plano {formatInterval(interval || "monthly")}
          </span>
          <span className="text-xs text-muted-foreground">
            Pagamento processado via Stripe
          </span>
        </div>
      )}
    </motion.div>
  );
}
