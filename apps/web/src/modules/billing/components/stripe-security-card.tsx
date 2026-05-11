"use client";

import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle } from "lucide-react";
import { Card } from "@marginflow/ui";
import { itemVariants } from "@/lib/animations";

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 25" fill="currentColor" aria-hidden>
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.09 10.09 0 0 1-4.56 1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02.9-.06 1.58zm-6.5-5.63c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM48.04 4.56l.04.02-.1 3.62h-.08c-1.38-.6-2.87-.83-4.32-.83-1.28 0-2.23.29-2.23 1.18 0 2.2 6.36.65 6.36 5.74 0 3.22-2.8 4.39-5.77 4.39-1.85 0-3.68-.37-5.1-1.05l.08-3.54h.1c1.42.73 3.22 1.12 4.78 1.12 1.38 0 2.46-.33 2.46-1.37 0-2.39-6.36-.75-6.36-5.67 0-3.05 2.56-4.2 5.23-4.2 1.6 0 3.16.27 4.56.77l-.02.02-.03-.17zM37.3 4.44h4.2v14.2h-4.2V4.44zm0-4.44h4.2v3.32h-4.2V0zM32.16 4.44v1.2h.04c.92-1.03 2.27-1.54 3.84-1.54.42 0 .83.04 1.23.13v3.93c-.42-.1-.88-.15-1.37-.15-1.67 0-3.26.75-3.26 2.87v8.77h-4.2V4.44h3.82zm-7.76 7.83c0-2.39-1.15-3.22-2.8-3.22-1.42 0-2.56.9-2.56 2.62 0 2.25 1.52 3.02 3.45 3.02 1.25 0 2.28-.31 2.9-.8v-1.62zm.02-7.83v8.68h-.04c-.62.52-1.79 1.04-3.52 1.04-3.47 0-6.32-2.1-6.32-6.04 0-3.71 2.64-6.2 6.03-6.2 1.52 0 2.75.44 3.47 1.08h.08V4.44h3.72v13.48c0 4.15-3.05 6.35-7.32 6.35-1.85 0-3.47-.37-4.85-1.02l.1-3.43c1.14.66 2.73 1.1 4.29 1.1 2.64 0 4.36-1.23 4.36-3.73V9.27h-.01zM11.5.18l4.26.93v3.65l-4.26-.93V.18zm0 4.56h4.26v13.9H11.5V4.74zm-4.5 0v1.2h.04c.92-1.03 2.27-1.54 3.84-1.54.42 0 .83.04 1.23.13v3.93c-.42-.1-.88-.15-1.37-.15-1.67 0-3.26.75-3.26 2.87v8.77H3.3V4.74h3.7zM0 9.13c0-3.26 2.5-4.68 5.42-4.68.56 0 1.12.06 1.67.17v3.56a5.6 5.6 0 0 0-1.5-.2c-1.33 0-2.1.5-2.1 1.63v8.84H0V9.13z" />
    </svg>
  );
}

export function StripeSecurityCard() {
  return (
    <motion.div variants={itemVariants}>
      <Card className="overflow-hidden border-border/60">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
          {/* Logo Stripe */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/20">
            <StripeLogo className="h-7 w-7" />
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground">Pagamento seguro via Stripe</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Todas as informações de pagamento são armazenadas e processadas de forma segura pelo Stripe. 
                Não armazenamos dados de cartão em nossos servidores.
              </p>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-success" />
                <span>SSL 256-bit</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-success" />
                <span>PCI DSS compliant</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Autenticação 3D Secure</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
