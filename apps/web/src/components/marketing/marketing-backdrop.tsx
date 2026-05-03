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
            "radial-gradient(ellipse 100% 70% at 50% -15%, rgba(14, 122, 111, 0.07), transparent 50%), radial-gradient(ellipse 60% 50% at 95% 30%, rgba(14, 122, 111, 0.05), transparent 50%), linear-gradient(180deg, #f2ede6 0%, #ebe6df 45%, #e3ddd4 100%)",
        }}
      />
      <div className="mf-grid-bg absolute inset-0 opacity-40" aria-hidden />
      <ParticleBackground />
    </div>
  );
}
