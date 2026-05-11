"use client";

import { motion } from "framer-motion";
import { Check, CreditCard, Building2, Rocket } from "lucide-react";
import { fadeInVariants } from "@/lib/animations";

interface SetupStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: "completed" | "current" | "upcoming";
}

interface SetupProgressProps {
  currentStep: string;
}

export function SetupProgress({ currentStep }: SetupProgressProps) {
  const steps: SetupStep[] = [
    {
      id: "payment",
      label: "Pagamento",
      description: "Assinatura confirmada",
      icon: CreditCard,
      status: "completed",
    },
    {
      id: "organization",
      label: "Organização",
      description: "Criar workspace",
      icon: Building2,
      status: currentStep === "organization" ? "current" : "upcoming",
    },
    {
      id: "start",
      label: "Começar",
      description: "Acessar o app",
      icon: Rocket,
      status: "upcoming",
    },
  ];

  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      {/* Desktop: Horizontal Steps */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Progress Line Background */}
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
          
          {/* Progress Line Fill */}
          <div className="absolute left-0 top-5 h-0.5 bg-accent transition-all duration-500" 
            style={{ width: currentStep === "organization" ? "33%" : "0%" }} 
          />

          <div className="relative flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    step.status === "completed"
                      ? "border-accent bg-accent text-white"
                      : step.status === "current"
                        ? "border-accent bg-accent/10 text-accent ring-4 ring-accent/20"
                        : "border-border bg-surface-strong text-muted-foreground"
                  }`}
                >
                  {step.status === "completed" ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-3 text-center">
                  <p
                    className={`text-sm font-medium ${
                      step.status === "completed" || step.status === "current"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Compact Current Step */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-strong/50 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Etapa 2 de 3: Organização
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full w-2/3 rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
