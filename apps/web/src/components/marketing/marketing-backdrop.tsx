"use client";

import dynamic from "next/dynamic";

const ParticleBackground = dynamic(
  () => import("@/components/marketing/particle-background").then((m) => m.ParticleBackground),
  { ssr: false },
);

export function MarketingBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 70% at 50% -15%, rgba(14, 122, 111, 0.06), transparent 50%), radial-gradient(ellipse 60% 50% at 95% 30%, rgba(14, 122, 111, 0.04), transparent 50%), linear-gradient(180deg, #fdfcfa 0%, #ffffff 40%, #f8f6f3 100%)",
        }}
      />
      <div className="mf-grid-bg absolute inset-0 opacity-40" aria-hidden />
      <ParticleBackground />
    </div>
  );
}
