"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { CompleteOnboardingResponse } from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants } from "@/lib/animations";
import {
  SetupHeader,
  OrganizationSetupCard,
  SetupInfoCard,
} from "@/modules/onboarding";

type OnboardingPanelProps = {
  userName: string;
};

export function OnboardingPanel({ userName }: OnboardingPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: { name: string; slug: string | null }) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiClient.post<{ data: CompleteOnboardingResponse; error: null }>(
        "/onboarding/organization",
        {
          body: {
            name: data.name,
            slug: data.slug,
          },
        },
      );
      router.replace("/app");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível concluir a configuração. Tente novamente.",
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
      {/* Header */}
      <SetupHeader userName={userName} />

      {/* Content Grid — mesma altura nas colunas em telas grandes */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-stretch">
        <OrganizationSetupCard
          userName={userName}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          message={message}
        />

        <div className="flex min-h-0 flex-col">
          <SetupInfoCard />
        </div>
      </div>
    </motion.div>
  );
}
