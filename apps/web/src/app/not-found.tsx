import Link from "next/link";
import { Button, Card, Container } from "@marginflow/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center py-10">
      <Container size="sm" className="flex justify-center">
        <Card variant="elevated" className="max-w-md text-center animate-rise-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
            <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">404</p>
          <h1 className="mt-2 text-xl font-semibold text-foreground">Página não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A página que você procura não existe ou foi movida.
          </p>
          <div className="mt-6">
            <Button asChild size="sm">
              <Link href="/">Ir para início</Link>
            </Button>
          </div>
        </Card>
      </Container>
    </main>
  );
}
