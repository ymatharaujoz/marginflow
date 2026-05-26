"use client";

import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { fadeInVariants } from "@/lib/animations";

interface IntegrationsHeaderProps {
  organizationName: string;
  isConnected?: boolean;
}

export function IntegrationsHeader({
  organizationName,
  isConnected = false,
}: IntegrationsHeaderProps) {
  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Título e Subtítulo */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Integrações
            </h1>
            <StatusBadge
              status={isConnected ? "success" : "inactive"}
              label={isConnected ? "Conectado" : "Desconectado"}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie a conexão de <span className="font-medium text-foreground">{organizationName}</span> com seus marketplaces
          </p>
        </div>
      </div>
    </motion.div>
  );
}
