"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Building2, FileDigit } from "lucide-react";
import { Button, Card } from "@lucreii/ui";
import { itemVariants } from "@/lib/animations";

interface CompanySetupCardProps {
  organizationName: string;
  isSubmitting: boolean;
  message: string | null;
  onSubmit: (data: { cnpj: string; isActive: true; razaoSocial: string }) => void;
}

function normalizeCnpj(value: string) {
  return value.replace(/\D/g, "").slice(0, 14);
}

function formatCnpj(value: string) {
  const digits = normalizeCnpj(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function CompanySetupCard({
  organizationName,
  isSubmitting,
  message,
  onSubmit,
}: CompanySetupCardProps) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const suggestedRazaoSocial = `Minha Razão Social`;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const razaoSocialValid = razaoSocial.trim().length >= 2;
    const cnpjValid = normalizeCnpj(cnpj).length === 14;

    if (!razaoSocialValid || !cnpjValid) {
      setShowErrors(true);
      return;
    }

    onSubmit({
      cnpj: normalizeCnpj(cnpj),
      isActive: true,
      razaoSocial: razaoSocial.trim(),
    });
  }

  const razaoSocialError = showErrors && razaoSocial.trim().length < 2;
  const cnpjError = showErrors && normalizeCnpj(cnpj).length !== 14;

  return (
    <motion.div variants={itemVariants} className="h-full min-h-0">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border bg-surface-strong/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Primeira empresa</h3>
              <p className="text-xs text-muted-foreground">
                Cadastre sua primeira empresa que será usada nas importações, custos, impostos e filtros mensais.
              </p>
            </div>
          </div>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col justify-between p-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Razão Social
                <span className="text-xs font-normal text-error">*</span>
              </label>
              <input
                className={`w-full rounded-lg border bg-surface-strong px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border-strong focus:ring-2 ${
                  razaoSocialError
                    ? "border-error hover:border-error focus:border-error focus:ring-error/10"
                    : "border-border focus:border-accent focus:ring-accent/10"
                }`}
                maxLength={255}
                minLength={2}
                onChange={(event) => {
                  setShowErrors(false);
                  setRazaoSocial(event.target.value);
                }}
                placeholder={suggestedRazaoSocial}
                required
                type="text"
                value={razaoSocial}
              />
              {razaoSocialError ? (
                <p className="text-xs text-error">Informe pelo menos 2 caracteres</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileDigit className="h-4 w-4 text-muted-foreground" />
                CNPJ
                <span className="text-xs font-normal text-error">*</span>
              </label>
              <input
                className={`w-full rounded-lg border bg-surface-strong px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border-strong focus:ring-2 ${
                  cnpjError
                    ? "border-error hover:border-error focus:border-error focus:ring-error/10"
                    : "border-border focus:border-accent focus:ring-accent/10"
                }`}
                inputMode="numeric"
                maxLength={18}
                onChange={(event) => {
                  setShowErrors(false);
                  setCnpj(formatCnpj(event.target.value));
                }}
                placeholder="00.000.000/0000-00"
                required
                type="text"
                value={cnpj}
              />
              {cnpjError ? (
                <p className="text-xs text-error">Informe 14 digitos de CNPJ</p>
              ) : null}
            </div>

            {message ? (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="flex items-start gap-3 rounded-lg border border-error/20 bg-error/10 px-4 py-3"
                initial={{ height: 0, opacity: 0 }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                <p className="text-sm text-foreground">{message}</p>
              </motion.div>
            ) : null}
          </div>

          <div className="shrink-0 pt-6">
            <Button
              className="w-full gap-2 text-white hover:text-white [&_svg]:text-white"
              disabled={isSubmitting}
              loading={isSubmitting}
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <>Criando empresa...</>
              ) : (
                <>
                  Criar empresa e entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
