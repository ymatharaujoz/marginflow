"use client";

import { motion } from "framer-motion";
import { Check, CreditCard, Building2, Rocket, Factory } from "lucide-react";
import { fadeInVariants } from "@/lib/animations";

interface SetupStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "completed" | "current" | "upcoming";
}

interface SetupProgressProps {
  currentStep: "organization" | "company";
}

export function SetupProgress({ currentStep }: SetupProgressProps) {
  const steps: SetupStep[] = [
    {
      id: "payment",
      label: "Pagamento",
      icon: CreditCard,
      status: "completed",
    },
    {
      id: "organization",
      label: "Organização",
      icon: Building2,
      status: currentStep === "organization" ? "current" : "completed",
    },
    {
      id: "company",
      label: "Empresa",
      icon: Factory,
      status: currentStep === "company" ? "current" : "upcoming",
    },
    {
      id: "start",
      label: "Começar",
      icon: Rocket,
      status: "upcoming",
    },
  ];

  const progressWidth = currentStep === "organization" ? "25%" : "50%";
  const mobileStep = currentStep === "organization" ? "2" : "3";
  const mobileTotal = "4";
  const mobileLabel = currentStep === "organization" ? "Organização" : "Empresa";
  const mobileProgressWidth = currentStep === "organization" ? "w-1/3" : "w-2/3";

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
          <div
            className="absolute left-0 top-5 h-0.5 bg-accent transition-all duration-500"
            style={{ width: progressWidth }}
          />

          <div className="relative flex justify-between">
            {steps.map((step) => (
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
            {currentStep === "organization" ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <Factory className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Etapa {mobileStep} de {mobileTotal}: {mobileLabel}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full bg-accent ${mobileProgressWidth}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
