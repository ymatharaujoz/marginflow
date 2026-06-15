"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BrandName } from "@/components/brand-name";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

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
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-transform"
        >
          <BrandLogo className="h-12 w-auto transition-transform group-hover:scale-105" />
          <BrandName className="text-base font-bold tracking-tight" />
        </Link>

        {/* User Info + Theme Toggle + Sign Out */}
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user.email}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
