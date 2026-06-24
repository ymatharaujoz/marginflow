"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { fadeInVariants } from "@/lib/animations";

interface ManualSyncRangeErrorBannerProps {
  error: string;
  describedById?: string;
}

const errorCopyMap: Record<
  string,
  { title: string; suggestion: string }
> = {
  "Selecione data inicial e final.": {
    suggestion:
      "Preencha ambos os campos para habilitar a sincronização manual.",
    title: "Datas obrigatórias",
  },
  "Período inválido.": {
    suggestion: "Revise as datas selecionadas e tente novamente.",
    title: "Formato inválido",
  },
  "Data inicial não pode ser maior que data final.": {
    suggestion: "A data inicial deve ser anterior ou igual à data final.",
    title: "Intervalo invertido",
  },
  "Período manual deve ficar dentro dos últimos 30 dias.": {
    suggestion: "Selecione datas mais recentes, dentro da janela permitida.",
    title: "Fora da janela de 30 dias",
  },
  "Período manual não pode ultrapassar 1 mês.": {
    suggestion: "Reduza o intervalo para no máximo 1 mês.",
    title: "Período muito longo",
  },
};

const fallbackCopy = {
  suggestion: "Revise o período selecionado e tente novamente.",
  title: "Período inválido",
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
