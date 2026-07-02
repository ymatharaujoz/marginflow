"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { fadeInVariants } from "@/lib/animations";

interface ManualSyncRangeErrorBannerProps {
  error: string;
  describedById?: string;
}

const errorCopyMap: Record<string, { title: string; suggestion: string }> = {
  "Selecione data inicial e final.": {
    suggestion:
      "Preencha ambos os campos para habilitar a sincronizacao manual.",
    title: "Datas obrigatorias",
  },
  "Periodo invalido.": {
    suggestion: "Revise as datas selecionadas e tente novamente.",
    title: "Formato invalido",
  },
  "Data inicial nao pode ser maior que data final.": {
    suggestion: "A data inicial deve ser anterior ou igual a data final.",
    title: "Intervalo invertido",
  },
  "Periodo manual deve ficar dentro dos ultimos 60 dias.": {
    suggestion: "Selecione datas mais recentes, dentro da janela permitida.",
    title: "Fora da janela de 60 dias",
  },
  "Periodo manual nao pode exceder 60 dias.": {
    suggestion: "Reduza intervalo para no maximo 60 dias.",
    title: "Acima de 60 dias",
  },
};

const fallbackCopy = {
  suggestion: "Revise o periodo selecionado e tente novamente.",
  title: "Periodo invalido",
};

export function ManualSyncRangeErrorBanner({
  error,
  describedById,
}: ManualSyncRangeErrorBannerProps) {
  const copy = errorCopyMap[error] ?? fallbackCopy;

  return (
    <motion.div
      id={describedById}
      role="alert"
      aria-live="polite"
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -4, transition: { duration: 0.18 } }}
      className="relative flex w-full items-start gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-error/25 bg-error-soft/70 px-4 py-3 shadow-[var(--shadow-sm)] backdrop-blur-sm"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-error"
      />
      <motion.span
        aria-hidden
        animate={{ scale: [1, 1.06, 1] }}
        transition={{
          duration: 2.4,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-error/15 text-error"
      >
        <AlertCircle className="h-4 w-4" />
      </motion.span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-error">
          {copy.title}
        </p>
        <p className="text-sm font-medium leading-snug text-foreground">
          {error}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {copy.suggestion}
        </p>
      </div>
    </motion.div>
  );
}
