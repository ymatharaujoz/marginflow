import { Container, Card } from "@marginflow/ui";

export default function Loading() {
  return (
    <main className="min-h-screen py-10">
      <Container className="flex min-h-[70vh] items-center justify-center">
        <Card className="max-w-xl animate-pulse text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-foreground-soft">
            MarginFlow
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">Loading workspace</h1>
          <p className="mt-3 text-base leading-7 text-foreground-soft">
            Preparing route shell, providers, and placeholder data surface.
          </p>
        </Card>
      </Container>
    </main>
  );
}
