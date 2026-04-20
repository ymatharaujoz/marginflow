import Link from "next/link";
import { Button, Container } from "@marginflow/ui";

export default function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen py-6 md:py-8">
      <Container className="space-y-6">
        <header className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Private app boundary
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Protected layout placeholder</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-foreground-soft">
              Auth enforcement arrives in M5. M2 only establishes dedicated shell and route
              ownership for private product pages.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href="/">Back to marketing</Link>
            </Button>
          </div>
        </header>
        {children}
      </Container>
    </div>
  );
}
