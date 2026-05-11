"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { Card, Button } from "@marginflow/ui";
import { itemVariants } from "@/lib/animations";
import { PUBLIC_BRAND } from "@/lib/public-branding";

export function PendingOnboardingCard() {
  return (
    <motion.div variants={itemVariants}>
      <Card className="overflow-hidden border-warning/30">
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-warning/3 to-transparent" />
          
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Sparkles className="h-6 w-6" />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                      <AlertCircle className="h-3 w-3" />
                      Ação necessária
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Complete seu setup
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Seu pagamento foi confirmado! Agora você precisa criar sua organização 
                    para começar a usar o {PUBLIC_BRAND.name}.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    variant="primary"
                    className="gap-2 text-white hover:text-white [&_svg]:text-white"
                  >
                    <Link href="/app/onboarding">
                      Completar configuração
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <a href="mailto:suporte@marginflow.com">
                      Precisa de ajuda?
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
