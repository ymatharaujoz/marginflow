"use client";

import { motion } from "framer-motion";

export function MarketingBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base: same canvas as body / app shell (globals.css) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% -12%, rgba(14, 122, 111, 0.055), transparent 58%), radial-gradient(ellipse 55% 45% at 92% 18%, rgba(14, 122, 111, 0.035), transparent 52%), linear-gradient(180deg, var(--background) 0%, var(--background-soft) 100%)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />

      {/* Floating gradient orbs */}
      <motion.div
        className="absolute -left-32 top-20 h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14, 122, 111, 0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute -right-20 top-40 h-[400px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14, 122, 111, 0.05) 0%, rgba(16, 185, 129, 0.03) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
        animate={{
          y: [0, 15, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-20 left-1/3 h-[300px] w-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14, 122, 111, 0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{
          y: [0, -15, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Top highlight line */}
      <div
        className="absolute left-0 right-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(14, 122, 111, 0.15) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
