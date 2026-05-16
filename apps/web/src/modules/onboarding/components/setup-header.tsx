"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { fadeInVariants } from "@/lib/animations";

interface SetupHeaderProps {
  organizationName?: string | null;
  stage?: "company" | "organization";
  userName: string;
}

export function SetupHeader({
  organizationName = null,
  stage = "organization",
  userName,
}: SetupHeaderProps) {
  const isCompanyStage = stage === "company";

  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center gap-2">
        <a
          href="/app/billing/manage"
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Voltar para assinatura
        </a>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {isCompanyStage ? "Cadastre sua primeira empresa" : "Crie sua organização"}
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          {isCompanyStage
            ? `A organização ${organizationName ?? "do seu workspace"} já está pronta. Agora falta a empresa para liberar produtos, custos e filtros mensais`
            : "Seu pagamento foi confirmado. Agora vamos configurar para começar a usar  a aplicação"}
        </p>
      </div>
    </motion.div>
  );
}
