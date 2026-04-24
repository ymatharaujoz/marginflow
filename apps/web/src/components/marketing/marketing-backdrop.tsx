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
            "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(0, 212, 255, 0.09), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 30%, rgba(0, 123, 255, 0.06), transparent 50%), linear-gradient(180deg, #f8fafc 0%, #ffffff 45%, #f1f5f9 100%)",
        }}
      />
      <div className="mf-grid-bg absolute inset-0 opacity-[0.55]" aria-hidden />
      <ParticleBackground />
    </div>
  );
}
