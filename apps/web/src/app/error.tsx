"use client";

import { Button, Card, Container } from "@marginflow/ui";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="en-US">
      <body>
        <main className="min-h-screen py-10">
          <Container className="flex min-h-[70vh] items-center justify-center">
            <Card className="max-w-xl text-center">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-warning">
                Unexpected state
              </p>
              <h1 className="mt-4 text-3xl font-semibold text-foreground">
                Frontend scaffold hit an error
              </h1>
              <p className="mt-3 text-base leading-7 text-foreground-soft">{error.message}</p>
              <div className="mt-6 flex justify-center">
                <Button onClick={reset}>Try again</Button>
              </div>
            </Card>
          </Container>
        </main>
      </body>
    </html>
  );
}
