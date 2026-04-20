import { Container } from "@marginflow/ui";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="py-6 md:py-8">
      <Container>
        <header className="flex items-center justify-between rounded-full border border-border bg-surface px-5 py-3 shadow-[var(--shadow-card)] backdrop-blur">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-foreground">MARGINFLOW</p>
            <p className="text-xs text-foreground-soft">Marketing route shell</p>
          </div>
          <div className="rounded-full border border-border bg-background-soft px-3 py-1 text-xs font-medium text-foreground-soft">
            M2 Frontend Scaffold
          </div>
        </header>
      </Container>
      {children}
    </div>
  );
}
