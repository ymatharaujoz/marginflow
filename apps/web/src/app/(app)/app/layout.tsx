import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, Container } from "@marginflow/ui";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { readServerAuthState } from "@/lib/server-auth";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authState = await readServerAuthState();

  if (!authState) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen py-6 md:py-8">
      <Container className="space-y-6">
        <header className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Authenticated workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              {authState.organization.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-foreground-soft">
              Signed in as {authState.user.email}. Role: {authState.organization.role}. Default
              workspace slug: {authState.organization.slug}.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href="/app/billing">Billing</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Back to marketing</Link>
            </Button>
            <SignOutButton />
          </div>
        </header>
        {children}
      </Container>
    </div>
  );
}
