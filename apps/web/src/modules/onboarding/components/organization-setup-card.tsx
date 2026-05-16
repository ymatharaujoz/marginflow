"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Link2, AlertCircle, ArrowRight } from "lucide-react";
import { Button, Card } from "@marginflow/ui";
import { itemVariants } from "@/lib/animations";

interface OrganizationSetupCardProps {
  userName: string;
  onSubmit: (data: { name: string; slug: string | null }) => void;
  isSubmitting: boolean;
  message: string | null;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export function OrganizationSetupCard({
  userName,
  onSubmit,
  isSubmitting,
  message,
}: OrganizationSetupCardProps) {
  const suggestedName = `${userName} Workspace`;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setShowErrors(false);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "").substring(0, 50));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setShowErrors(true);
      return;
    }
    onSubmit({
      name: name.trim(),
      slug: slug.trim().length > 0 ? slug.trim() : null,
    });
  }

  const displayName = name.trim() || suggestedName;
  const displaySlug = slug || generateSlug(displayName);
  const previewUrl = `marginflow.com/app/${displaySlug}`;
  const nameError = showErrors && name.trim().length < 2;

  return (
    <motion.div variants={itemVariants} className="h-full min-h-0">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden">
        {/* Card Header */}
        <div className="shrink-0 border-b border-border bg-surface-strong/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Detalhes da organização</h3>
              <p className="text-xs text-muted-foreground">
                Escolha um nome para identificar sua organização
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="flex min-h-0 flex-1 flex-col justify-between p-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Organization Name Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Nome da organização
                <span className="text-xs font-normal text-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Minha Organização"
                required
                minLength={2}
                maxLength={100}
                className={`w-full rounded-lg border bg-surface-strong px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border-strong focus:ring-2 ${
                  nameError
                    ? "border-error hover:border-error focus:border-error focus:ring-error/10"
                    : "border-border focus:border-accent focus:ring-accent/10"
                }`}
              />
              <div className="flex items-center justify-between text-xs">
                <span className={nameError ? "text-error" : "text-muted-foreground"}>
                  {nameError ? "Informe pelo menos 2 caracteres" : "Este nome será exibido no dashboard e relatórios"}
                </span>
                <span className={`${name.length > 90 ? "text-warning" : "text-muted-foreground"}`}>
                  {name.length}/100
                </span>
              </div>
            </div>

            {/* Slug Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                URL personalizada
                <span className="inline-flex items-center rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-normal text-muted-foreground">
                  Opcional
                </span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 pr-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">marginflow.com/app/</span>
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={generateSlug(name) || "minha-organizacao"}
                  className="w-full rounded-lg border border-border bg-surface-strong py-3 pl-[11rem] pr-4 text-sm font-medium text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
                {slugManuallyEdited && slug && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugManuallyEdited(false);
                      setSlug("");
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-accent hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Deixe em branco para gerar automaticamente
              </p>
            </div>

            {/* Preview Card */}
            {name.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border border-border bg-surface-strong/50 p-4"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Pré-visualização
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-lg font-medium text-accent">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{previewUrl}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-start gap-3 rounded-lg border border-error/20 bg-error/10 px-4 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                <p className="text-sm text-foreground">{message}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="shrink-0 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                size="lg"
                className="w-full gap-2 text-white hover:text-white [&_svg]:text-white"
              >
                {isSubmitting ? (
                  <>Criando organização...</>
                ) : (
                  <>
                    Criar organização e continuar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-auto shrink-0 border-t border-border bg-surface-strong/30 px-6 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Você poderá alterar essas informações depois nas configurações
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
