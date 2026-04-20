const setupCards = [
  {
    title: "Single-app foundation",
    description:
      "Next.js App Router, Tailwind, TypeScript strict mode, and a root-level project layout tuned for Vercel.",
  },
  {
    title: "Boundary-first structure",
    description:
      "Shared modules are already split into auth, billing, database, domain, integrations, and validation layers.",
  },
  {
    title: "Ready for milestone one",
    description:
      "The repo now has linting, tests, environment validation, docs, and CI in place so feature work can start cleanly.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12 md:px-10">
      <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-border bg-white/70 px-4 py-1 text-sm font-medium text-muted shadow-sm backdrop-blur">
            MarginFlow repository foundation
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
              M0 is scaffolded and ready for the first product milestone.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              This starter shell exists to prove the repository is wired correctly before
              auth, billing, analytics, and integrations land. The structure is intentionally
              lean now and extraction-ready later.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm font-medium">
            <span className="rounded-full bg-accent px-4 py-2 text-accent-foreground">
              Next.js 16 App Router
            </span>
            <span className="rounded-full border border-border bg-white px-4 py-2 text-foreground">
              pnpm + strict TypeScript
            </span>
            <span className="rounded-full border border-border bg-white px-4 py-2 text-foreground">
              ESLint + Prettier + Vitest
            </span>
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
                Foundation checklist
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Technical baseline in place
              </h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              M0
            </div>
          </div>

          <div className="space-y-4">
            {setupCards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-border bg-slate-50/70 p-5">
                <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
