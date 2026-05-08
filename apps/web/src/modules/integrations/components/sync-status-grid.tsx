"use client";

import { motion } from "framer-motion";
import { RefreshCw, Clock, Calendar, CheckCircle2, Ban, Activity } from "lucide-react";
import { Card, Skeleton } from "@marginflow/ui";
import { containerVariants, itemVariants, hoverTransition } from "@/lib/animations";
import { translateApiMessage, translateSyncWindowLabel } from "@/lib/pt-br/api-ui";
import { formatDateTime } from "../lib/formatters";
import type { SyncStatusResponse, SyncRunRecord } from "../types/integrations";

interface SyncStatusGridProps {
  syncStatus?: SyncStatusResponse;
  lastRun?: SyncRunRecord;
  isLoading: boolean;
}

export function SyncStatusGrid({ syncStatus, lastRun, isLoading }: SyncStatusGridProps) {
  if (isLoading || !syncStatus) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="outlined" className="p-5">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const canRun = syncStatus.availability.canRun;
  const nextWindow = syncStatus.availability.nextAvailableAt;
  const lastSync = syncStatus.availability.lastSuccessfulSyncAt;
  const isActive = !!syncStatus.activeRun;

  const cards = [
    {
      key: "status",
      icon: canRun ? CheckCircle2 : Ban,
      iconColor: canRun ? "text-success" : "text-muted-foreground",
      iconBg: canRun ? "bg-success/10" : "bg-muted/20",
      label: "Status",
      value: canRun ? "Disponível" : "Bloqueada",
      description: canRun ? "Pronto para sincronizar" : translateApiMessage(syncStatus.availability.message) || "Aguarde",
      borderColor: canRun ? "border-success/30" : "border-border",
      accentColor: canRun ? "success" : "neutral" as const,
    },
    {
      key: "window",
      icon: Calendar,
      iconColor: "text-accent",
      iconBg: "bg-accent/10",
      label: "Janela Atual",
      value: translateSyncWindowLabel(syncStatus.availability.currentWindowLabel),
      description: canRun ? "Pode sincronizar agora" : nextWindow ? `Próxima: ${formatDateTime(nextWindow)}` : "-",
      borderColor: "border-accent/30",
      accentColor: "accent" as const,
    },
    {
      key: "last",
      icon: Clock,
      iconColor: lastSync ? "text-foreground" : "text-warning",
      iconBg: lastSync ? "bg-foreground/5" : "bg-warning/10",
      label: "Última Sincronização",
      value: lastSync ? formatDateTime(lastSync) : "Nunca",
      description: lastRun
        ? `${lastRun.counts.orders} pedidos importados`
        : "Nenhuma sincronização realizada",
      borderColor: lastSync ? "border-border" : "border-warning/30",
      accentColor: lastSync ? "neutral" : "warning" as const,
    },
    {
      key: "active",
      icon: isActive ? RefreshCw : Activity,
      iconColor: isActive ? "text-accent" : "text-success",
      iconBg: isActive ? "bg-accent/10" : "bg-success/10",
      isSpinning: isActive,
      label: "Execução Ativa",
      value: isActive ? "Em andamento" : "Nenhuma",
      description: isActive
        ? `Iniciada ${formatDateTime(syncStatus.activeRun!.startedAt)}`
        : "Sistema aguardando",
      borderColor: isActive ? "border-accent/30" : "border-success/30",
      accentColor: isActive ? "accent" : "success" as const,
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            variants={itemVariants}
            whileHover={{
              y: -2,
              transition: hoverTransition,
            }}
          >
            <Card
              variant="outlined"
              padding="none"
              className={`relative h-full overflow-hidden border p-5 shadow-[var(--shadow-xs)] transition-all hover:shadow-[var(--shadow-sm)] ${card.borderColor}`}
            >
              {/* Top accent — relative ao Card para não herdar largura do motion.div (transform) */}
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 ${
                  card.accentColor === "success" ? "bg-success" :
                  card.accentColor === "accent" ? "bg-accent" :
                  card.accentColor === "warning" ? "bg-warning" :
                  "bg-muted"
                }`}
              />
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${card.iconBg}`}>
                  <Icon className={`h-4.5 w-4.5 ${card.iconColor} ${card.isSpinning ? "animate-spin" : ""}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
