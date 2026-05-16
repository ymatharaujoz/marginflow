"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Company, CompleteOnboardingResponse } from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants } from "@/lib/animations";
import {
  CompanySetupCard,
  SetupHeader,
  OrganizationSetupCard,
  SetupInfoCard,
  SetupProgress,
} from "@/modules/onboarding";

type OnboardingPanelProps = {
  organizationName?: string | null;
  stage?: "company" | "organization";
  userName: string;
};

export function OnboardingPanel({
  organizationName: initialOrganizationName = null,
  stage: initialStage = "organization",
  userName,
}: OnboardingPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<"company" | "organization">(initialStage);
  const [organizationName, setOrganizationName] = useState<string | null>(initialOrganizationName);
  const isCompanyStage = stage === "company";

  async function handleOrganizationSubmit(data: { name: string; slug: string | null }) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await apiClient.post<{ data: CompleteOnboardingResponse; error: null }>(
        "/onboarding/organization",
        {
          body: {
            name: data.name,
            slug: data.slug,
          },
        },
      );
      setOrganizationName(result.data.organization.name);
      setStage("company");
      setIsSubmitting(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Nao foi possivel concluir a configuracao. Tente novamente.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleCompanySubmit(data: { code: string; isActive: true; name: string }) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiClient.post<{ data: Company; error: null }>("/companies", {
        body: data,
      });
      router.replace("/app");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Nao foi possivel concluir a configuracao da empresa. Tente novamente.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl space-y-8"
    >
      <SetupHeader organizationName={organizationName} stage={stage} userName={userName} />
      <SetupProgress currentStep={stage} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-stretch">
        {isCompanyStage ? (
          <CompanySetupCard
            isSubmitting={isSubmitting}
            message={message}
            onSubmit={handleCompanySubmit}
            organizationName={organizationName ?? `${userName} Workspace`}
          />
        ) : (
          <OrganizationSetupCard
            userName={userName}
            onSubmit={handleOrganizationSubmit}
            isSubmitting={isSubmitting}
            message={message}
          />
        )}

        <div className="flex min-h-0 flex-col">
          <SetupInfoCard stage={stage} />
        </div>
      </div>
    </motion.div>
  );
}
