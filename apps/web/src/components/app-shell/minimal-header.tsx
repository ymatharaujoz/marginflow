"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PUBLIC_BRAND } from "@/lib/public-branding";

type MinimalHeaderProps = {
  user: {
    email: string;
    image: string | null;
    name: string;
  };
};

export function MinimalHeader({ user }: MinimalHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[min(100%,1440px)] items-center justify-between px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-accent to-accent-strong text-xs font-bold text-white shadow-[0_2px_8px_rgba(14,122,111,0.25)]"
          >
            {PUBLIC_BRAND.icon}
          </motion.div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            {PUBLIC_BRAND.name}
          </span>
        </Link>

        {/* User Info + Sign Out */}
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
