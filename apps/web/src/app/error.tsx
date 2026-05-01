"use client";

import { Button, Card, Container } from "@marginflow/ui";

export default function AppErrorPage({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center py-10">
      <Container size="sm" className="flex justify-center">
        <Card variant="elevated" className="max-w-md text-center animate-rise-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
            <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Algo deu errado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <div className="mt-6">
            <Button onClick={reset} size="sm">
              Tentar novamente
            </Button>
          </div>
        </Card>
      </Container>
    </main>
  );
}
