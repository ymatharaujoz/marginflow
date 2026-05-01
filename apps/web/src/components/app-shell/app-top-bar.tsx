"use client";

import { usePathname, useRouter } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

type AppTopBarProps = {
  onMenuToggle: () => void;
};

const pageTitles: Record<string, string> = {
  "/app": "Painel",
  "/app/products": "Produtos e custos",
  "/app/integrations": "Integrações",
  "/app/billing": "Assinatura",
};

export function AppTopBar({ onMenuToggle }: AppTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] || "Painel";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface-strong/60 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors lg:hidden"
          onClick={onMenuToggle}
          type="button"
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="hidden text-sm font-medium text-muted-foreground hover:text-foreground transition-colors sm:block"
          onClick={() => router.push("/")}
          type="button"
        >
          Site institucional
        </button>
        <SignOutButton />
      </div>
    </header>
  );
}
