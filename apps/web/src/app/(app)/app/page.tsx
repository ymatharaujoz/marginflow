import { Card } from "@marginflow/ui";

const panels = [
  {
    title: "Session protection",
    description: "This route now redirects unauthenticated traffic and renders from API-backed session context.",
  },
  {
    title: "Organization bootstrap",
    description: "First successful Google login auto-creates a default workspace owner membership.",
  },
  {
    title: "API seam",
    description: "Cross-origin requests now carry credentials so future product endpoints can trust session cookies.",
  },
];

export default function AppHomePage() {
  return (
    <main className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="min-h-[340px]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground-soft">
          Protected dashboard shell
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          Authenticated route scaffold is active at `/app`.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-foreground-soft">
          M5 now owns authentication and access control. Billing, metrics, and product modules
          still come later, but route protection and org-aware session seams are live.
        </p>
      </Card>

      <div className="space-y-5">
        {panels.map((panel) => (
          <Card key={panel.title}>
            <h3 className="text-lg font-semibold text-foreground">{panel.title}</h3>
            <p className="mt-2 text-sm leading-7 text-foreground-soft">{panel.description}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
