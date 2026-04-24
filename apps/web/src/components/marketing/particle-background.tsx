"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export function ParticleBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo(
    () => ({
      background: { color: { value: "transparent" } },
      detectRetina: true,
      fpsLimit: 60,
      fullScreen: { enable: false },
      interactivity: {
        events: {
          onHover: { enable: false },
        },
      },
      particles: {
        color: { value: "#00d4ff" },
        links: {
          color: "#94a3b8",
          distance: 110,
          enable: true,
          opacity: 0.12,
          width: 0.6,
        },
        move: {
          direction: "none" as const,
          enable: true,
          outModes: { default: "bounce" as const },
          random: true,
          speed: 0.45,
        },
        number: { value: 42 },
        opacity: {
          value: { max: 0.2, min: 0.04 },
        },
        shape: { type: "circle" },
        size: {
          value: { max: 2.6, min: 1 },
        },
      },
    }),
    [],
  );

  if (!ready) {
    return null;
  }

  return (
    <Particles
      className="pointer-events-none absolute inset-0 h-full w-full"
      id="mf-landing-particles"
      options={options}
    />
  );
}
