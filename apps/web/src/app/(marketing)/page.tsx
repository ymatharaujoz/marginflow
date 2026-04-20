import Link from "next/link";
import { Button, Card, Container } from "@marginflow/ui";
import { getWebEnv } from "@/lib/env";

const checklist = [
  "Next.js App Router running from apps/web",
  "Marketing and app route boundaries split",
  "Typed frontend env and API client seams",
  "TanStack Query provider ready for real data",
];

export default function MarketingPage() {
  const webEnv = (() => {
    try {
      return getWebEnv();
    } catch {
      return {
        NEXT_PUBLIC_APP_URL: "Set NEXT_PUBLIC_APP_URL for runtime env",
        NEXT_PUBLIC_API_BASE_URL: "Set NEXT_PUBLIC_API_BASE_URL for runtime env",
      };
    }
  })();

  return (
    <main className="pb-12 pt-10 md:pb-16 md:pt-14">
      <Container className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-8 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Frontend milestone two
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            MarginFlow web app now lives where it should.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground-soft">
            This screen is placeholder shell for marketing routes. It proves `apps/web` owns
            routing, shared styles, env boundaries, and backend communication seams before real
            product UI lands in later milestones.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/app">Open app placeholder</Link>
            </Button>
            <Button asChild variant="secondary">
              <a href={webEnv.NEXT_PUBLIC_API_BASE_URL} target="_blank" rel="noreferrer">
                API base configured
              </a>
            </Button>
          </div>
        </section>

        <section className="space-y-5">
          <Card>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-foreground-soft">
              Scaffold checklist
            </p>
            <div className="mt-5 space-y-3">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm font-medium text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-foreground-soft">
              Public env seam
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground-soft">
              Build stays placeholder-safe without env vars. Shared helper still validates strictly
              when frontend code asks for runtime config.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
                <dt className="font-semibold text-foreground">App URL</dt>
                <dd className="mt-1 font-mono text-foreground-soft">{webEnv.NEXT_PUBLIC_APP_URL}</dd>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3">
                <dt className="font-semibold text-foreground">API base URL</dt>
                <dd className="mt-1 font-mono text-foreground-soft">
                  {webEnv.NEXT_PUBLIC_API_BASE_URL}
                </dd>
              </div>
            </dl>
          </Card>
        </section>
      </Container>
    </main>
  );
}
