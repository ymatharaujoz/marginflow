"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Link2,
  Power,
  ExternalLink,
  RefreshCw,
  Clock,
  Zap,
  Store,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button, Badge, Card } from "@marginflow/ui";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { containerVariants, itemVariants, fadeInVariants } from "@/lib/animations";
import { translateConnectionUiStatus } from "@/lib/pt-br/api-ui";
import { formatDateTime } from "../lib/formatters";
import type { IntegrationConnectionRecord, IntegrationProviderSlug } from "../types/integrations";

interface ConnectedMarketplacesSectionProps {
  connections: IntegrationConnectionRecord[];
  isLoading: boolean;
  isFetching: boolean;
  busyProvider: IntegrationProviderSlug | null;
  busyAction: "connect" | "disconnect" | null;
  onConnect: (provider: IntegrationProviderSlug) => void;
  onDisconnect: (provider: IntegrationProviderSlug) => void;
}

const marketplaceMeta: Record<
  string,
  {
    name: string;
    description: string;
    brandColor: string;
    brandColorSoft: string;
    icon: React.ReactNode;
    glowColor: string;
  }
> = {
  mercadolivre: {
    name: "Mercado Livre",
    description: "Sincronize pedidos, produtos e métricas em tempo real.",
    brandColor: "#FFE600",
    brandColorSoft: "rgba(255, 230, 0, 0.12)",
    icon: (
      <img src="/icons/mercado-libre-icon.svg" alt="Mercado Livre" className="h-7 w-auto" />
    ),
    glowColor: "rgba(255, 230, 0, 0.25)",
  },
  shopee: {
    name: "Shopee",
    description: "Integração em desenvolvimento",
    brandColor: "#EE4D2D",
    brandColorSoft: "rgba(238, 77, 45, 0.12)",
    icon: (
      <img src="/icons/shopee-icon.svg" alt="Shopee" className="h-7 w-auto brightness-0 invert" />
    ),
    glowColor: "rgba(238, 77, 45, 0.25)",
  },
};

function getStatusConfig(status: IntegrationConnectionRecord["status"]) {
  switch (status) {
    case "connected":
      return {
        badgeStatus: "success" as const,
        badgeLabel: "Conectado",
        cardBorder: "border-success/20",
        cardBg: "bg-success-soft/40",
        glow: true,
        accentIcon: "text-success",
        accentBg: "bg-success/10",
      };
    case "needs_reconnect":
      return {
        badgeStatus: "warning" as const,
        badgeLabel: "Reconexão necessária",
        cardBorder: "border-warning/30",
        cardBg: "bg-warning-soft/50",
        glow: false,
        accentIcon: "text-warning",
        accentBg: "bg-warning/10",
      };
    case "disconnected":
      return {
        badgeStatus: "inactive" as const,
        badgeLabel: "Desconectado",
        cardBorder: "border-border",
        cardBg: "bg-surface-strong/50",
        glow: false,
        accentIcon: "text-muted-foreground",
        accentBg: "bg-muted/15",
      };
    case "unavailable":
      return {
        badgeStatus: "warning" as const,
        badgeLabel: "Em breve",
        cardBorder: "border-border",
        cardBg: "bg-surface-strong/50",
        glow: false,
        accentIcon: "text-muted-foreground",
        accentBg: "bg-muted/15",
      };
    default:
      return {
        badgeStatus: "inactive" as const,
        badgeLabel: translateConnectionUiStatus(status) || "Desconhecido",
        cardBorder: "border-border",
        cardBg: "bg-surface-strong/50",
        glow: false,
        accentIcon: "text-muted-foreground",
        accentBg: "bg-muted/15",
      };
  }
}

function MarketplaceIconRing({
  icon,
  brandColor,
  glowColor,
  isConnected,
  isGlowing,
}: {
  icon: React.ReactNode;
  brandColor: string;
  glowColor: string;
  isConnected: boolean;
  isGlowing: boolean;
}) {
  return (
    <motion.div
      className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl"
      style={{
        backgroundColor: brandColor,
        boxShadow: isGlowing ? `0 0 32px ${glowColor}, 0 4px 16px ${glowColor}` : "none",
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {icon}
      {isConnected && (
        <motion.div
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-success"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.3 }}
        >
          <CheckCircle2 className="h-3 w-3 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
}

function ConnectionMetrics({
  lastSyncedAt,
  accountLabel,
}: {
  lastSyncedAt?: string;
  accountLabel?: string;
}) {
  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      className="mt-5 space-y-3 border-t border-border/60 pt-4"
    >
      {accountLabel && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Store className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Conta: <span className="font-medium text-foreground">{accountLabel}</span></span>
        </div>
      )}
      {lastSyncedAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Última sync: <span className="font-medium text-foreground">{formatDateTime(lastSyncedAt)}</span></span>
        </div>
      )}
    </motion.div>
  );
}

function MarketplaceActionButton({
  isConnected,
  isBusy,
  isConnecting,
  isDisconnecting,
  connectAvailable,
  onConnect,
  onDisconnect,
}: {
  isConnected: boolean;
  isBusy: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  connectAvailable: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (isConnected) {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDisconnect}
          disabled={isBusy}
          loading={isDisconnecting}
          className="group/btn gap-2 text-muted-foreground hover:bg-error/8 hover:text-error transition-colors"
        >
          <Power className="h-4 w-4 transition-transform group-hover/btn:rotate-12" />
          <span className="hidden sm:inline">Desconectar</span>
        </Button>
      </motion.div>
    );
  }

  return (
    <Button
      size="md"
      onClick={onConnect}
      disabled={!connectAvailable || isBusy}
      loading={isConnecting}
      className="gap-2 bg-accent px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-[var(--transition-fast)] hover:-translate-y-0.5 hover:bg-accent-strong hover:text-white hover:shadow-[var(--shadow-md)]"
    >
      <ExternalLink className="h-4 w-4" />
      Conectar
    </Button>
  );
}

function EmptyMarketplaceCard({ meta }: { meta: (typeof marketplaceMeta)["shopee"] }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col rounded-[var(--radius-xl)] border border-dashed border-border bg-surface-strong/40 p-6 transition-colors hover:border-border-strong hover:bg-surface-strong/60"
    >
      <div className="mb-5 flex items-center gap-4">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl opacity-70 transition-all group-hover:opacity-90"
          style={{ backgroundColor: meta.brandColor }}
        >
          {meta.icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{meta.name}</h3>
          <Badge variant="neutral" className="mt-1.5 text-[10px]">
            <Sparkles className="mr-1 h-3 w-3" />
            Em breve
          </Badge>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
      <div className="mt-auto pt-5">
        <div className="flex items-center gap-2 rounded-lg bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5" />
          Notifique-me quando disponível
        </div>
      </div>
    </motion.div>
  );
}

export function ConnectedMarketplacesSection({
  connections,
  isLoading,
  isFetching,
  busyProvider,
  busyAction,
  onConnect,
  onDisconnect,
}: ConnectedMarketplacesSectionProps) {
  const hasConnections = connections.length > 0;

  // Enriquece as conexões com metadados
  const enrichedConnections = useMemo(() => {
    return connections.map((conn) => ({
      ...conn,
      meta: marketplaceMeta[conn.provider] || {
        name: conn.displayName,
        description: "",
        brandColor: "#ccc",
        brandColorSoft: "rgba(204,204,204,0.12)",
        icon: <Store className="h-7 w-7 text-white" />,
        glowColor: "rgba(14,122,111,0.2)",
      },
    }));
  }, [connections]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Link2 className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="h-5 w-40 animate-pulse rounded bg-surface-strong" />
            <div className="mt-1.5 h-3.5 w-56 animate-pulse rounded bg-surface-strong" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="h-[280px] animate-pulse rounded-[var(--radius-xl)] bg-surface-strong" />
          <div className="h-[280px] animate-pulse rounded-[var(--radius-xl)] bg-surface-strong" />
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 shadow-[var(--shadow-xs)]">
            <Link2 className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Marketplaces Conectados
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hasConnections
                ? `${connections.filter((c) => c.status === "connected").length} de ${connections.length} ativos`
                : "Gerencie suas integrações de marketplace"}
            </p>
          </div>
        </div>

        {isFetching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Atualizando...
          </motion.div>
        )}
      </motion.div>

      {/* Cards Grid */}
      {hasConnections ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-5 sm:grid-cols-2"
        >
          {enrichedConnections.map((connection) => {
            const isConnecting = busyAction === "connect" && busyProvider === connection.provider;
            const isDisconnecting = busyAction === "disconnect" && busyProvider === connection.provider;
            const isBusy = isConnecting || isDisconnecting;
            const isConnected = connection.status === "connected";
            const isUnavailable = connection.status === "unavailable";
            const statusConfig = getStatusConfig(connection.status);

            // Card "Em breve"
            if (isUnavailable) {
              return (
                <EmptyMarketplaceCard key={connection.provider} meta={connection.meta} />
              );
            }

            return (
              <motion.div
                key={connection.provider}
                variants={itemVariants}
                whileHover={{
                  y: -4,
                  boxShadow: "var(--shadow-card)",
                  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                }}
                className={`group relative flex flex-col rounded-[var(--radius-xl)] border p-6 transition-colors ${statusConfig.cardBorder} ${statusConfig.cardBg} bg-surface hover:border-border-strong`}
              >
                {/* Subtle gradient overlay for connected state */}
                {isConnected && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[var(--radius-xl)] opacity-30"
                    style={{
                      background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${connection.meta.brandColorSoft}, transparent)`,
                    }}
                  />
                )}

                <div className="relative">
                  {/* Top row: icon + name + action */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <MarketplaceIconRing
                        icon={connection.meta.icon}
                        brandColor={connection.meta.brandColor}
                        glowColor={connection.meta.glowColor}
                        isConnected={isConnected}
                        isGlowing={statusConfig.glow}
                      />
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground">
                          {connection.meta.name}
                        </h3>
                        <StatusBadge
                          status={statusConfig.badgeStatus}
                          label={statusConfig.badgeLabel}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="shrink-0">
                      <MarketplaceActionButton
                        isConnected={isConnected}
                        isBusy={isBusy}
                        isConnecting={isConnecting}
                        isDisconnecting={isDisconnecting}
                        connectAvailable={connection.connectAvailable}
                        onConnect={() => onConnect(connection.provider)}
                        onDisconnect={() => onDisconnect(connection.provider)}
                      />
                    </div>
                  </div>

                  {/* Status message for non-connected */}
                  {!isConnected && connection.statusMessage && (
                    <motion.div
                      variants={fadeInVariants}
                      className="mt-4 flex items-start gap-2 rounded-lg bg-muted/10 px-3 py-2.5"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {connection.statusMessage}
                      </p>
                    </motion.div>
                  )}

                  {/* Connected details */}
                  {isConnected && (
                    <ConnectionMetrics
                      lastSyncedAt={connection.lastSyncedAt ?? undefined}
                      accountLabel={
                        connection.connectedAccountLabel || connection.connectedAccountId || undefined
                      }
                    />
                  )}

                  {/* Quick action hint for disconnected */}
                  {!isConnected && !isBusy && connection.connectAvailable && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-medium text-accent"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      Clique em "Conectar" para sincronizar seus dados
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={fadeInVariants} initial="hidden" animate="visible">
          <Card variant="outlined" className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/15">
              <Store className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Nenhuma integração disponível
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Conecte seu primeiro marketplace para começar a sincronizar pedidos e produtos.
            </p>
          </Card>
        </motion.div>
      )}
    </section>
  );
}
