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
        </div>
      </div>

    </motion.div>
  );
}
