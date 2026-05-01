"use client";

import { type ReactNode, useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopBar } from "./app-top-bar";

type AppLayoutClientProps = {
  children: ReactNode;
  organization: {
    name: string;
  };
  user: {
    email: string;
    image: string | null;
    name: string;
  };
};

export function AppLayoutClient({ children, organization, user }: AppLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar - desktop */}
      <div className="hidden lg:flex">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          user={user}
          organization={organization}
        />
      </div>

      {/* Sidebar - mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-[var(--transition-normal)] lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar
          collapsed={false}
          onToggle={() => setMobileOpen(false)}
          user={user}
          organization={organization}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopBar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
