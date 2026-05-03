import { Container, Skeleton } from "@marginflow/ui";
import { resolveSiteConfig } from "@/lib/site";

const brand = resolveSiteConfig();

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center py-10">
      <Container size="sm" className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft animate-pulse">
          <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Carregando workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">Preparando sua experiência no {brand.name}</p>
        </div>
        <Skeleton className="h-2 w-32" />
      </Container>
    </main>
  );
}
