"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { fadeInVariants } from "@/lib/animations";

interface SetupHeaderProps {
  userName: string;
}

export function SetupHeader({ userName }: SetupHeaderProps) {
  return (
    <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Back link */}
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
          Crie sua organização
        </h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Olá, <span className="font-medium text-foreground">{userName}</span>!{" "}
          Seu pagamento foi confirmado. Agora vamos configurar seu workspace para começar a usar o aplicativo.
        </p>
      </div>
    </motion.div>
  );
}
