"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Building2, Hash } from "lucide-react";
import { Button, Card } from "@marginflow/ui";
import { itemVariants } from "@/lib/animations";

interface CompanySetupCardProps {
  organizationName: string;
  isSubmitting: boolean;
  message: string | null;
  onSubmit: (data: { code: string; isActive: true; name: string }) => void;
}

function buildCompanyCode(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");

  if (normalized.length >= 2) {
    return normalized.slice(0, 12);
  }

  return `${normalized}MF`.slice(0, 12);
}

export function CompanySetupCard({
  organizationName,
  isSubmitting,
  message,
  onSubmit,
}: CompanySetupCardProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const suggestedName = `${organizationName} Principal`;
  const displayName = name.trim() || suggestedName;
  const suggestedCode = useMemo(() => buildCompanyCode("MINHAEMPRESA"), [displayName]);

  function handleNameChange(value: string) {
    setName(value);
    setShowErrors(false);
    if (!codeManuallyEdited) {
      setCode(buildCompanyCode(value));
    }
  }

  function handleCodeChange(value: string) {
    setCodeManuallyEdited(true);
    setShowErrors(false);
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameValid = name.trim().length >= 2;
    const codeValid = (code || suggestedCode).trim().length >= 2;
    if (!nameValid || !codeValid) {
      setShowErrors(true);
      return;
    }
    onSubmit({
      code: (code || suggestedCode).trim(),
      isActive: true,
      name: name.trim(),
    });
  }

  const nameError = showErrors && name.trim().length < 2;
  const codeError = showErrors && (code || suggestedCode).trim().length < 2;

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
                Cadastre a empresa usada nos custos e impostos mensais
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
                Nome da empresa
                <span className="text-xs font-normal text-error">*</span>
              </label>
              <input
                className={`w-full rounded-lg border bg-surface-strong px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border-strong focus:ring-2 ${
                  nameError
                    ? "border-error hover:border-error focus:border-error focus:ring-error/10"
                    : "border-border focus:border-accent focus:ring-accent/10"
                }`}
                maxLength={255}
                minLength={2}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Minha Empresa"
                required
                type="text"
                value={name}
              />
              {nameError && (
                <p className="text-xs text-error">Informe pelo menos 2 caracteres</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Codigo da empresa
                <span className="inline-flex items-center rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-normal text-muted-foreground">
                  Até 12 caracteres
                </span>
              </label>
              <input
                className={`w-full rounded-lg border bg-surface-strong px-4 py-3 text-sm font-medium uppercase text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border-strong focus:ring-2 ${
                  codeError
                    ? "border-error hover:border-error focus:border-error focus:ring-error/10"
                    : "border-border focus:border-accent focus:ring-accent/10"
                }`}
                maxLength={12}
                minLength={2}
                onChange={(event) => handleCodeChange(event.target.value)}
                placeholder={suggestedCode}
                required
                type="text"
                value={code}
              />
              <p className={`text-xs ${codeError ? "text-error" : "text-muted-foreground"}`}>
                {codeError ? "Informe pelo menos 2 caracteres" : "Este codigo identifica a empresa nos filtros mensais e no cadastro manual."}
              </p>
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
