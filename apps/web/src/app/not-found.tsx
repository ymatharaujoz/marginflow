import Link from "next/link";
import { Button, Card, Container } from "@marginflow/ui";

export default function NotFound() {
  return (
    <main className="min-h-screen py-10">
      <Container className="flex min-h-[70vh] items-center justify-center">
        <Card className="max-w-xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-foreground-soft">
            404
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">Route not found</h1>
          <p className="mt-3 text-base leading-7 text-foreground-soft">
            This placeholder route does not exist yet inside M2 scaffold.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild>
              <Link href="/">Go to marketing shell</Link>
            </Button>
          </div>
        </Card>
      </Container>
    </main>
  );
}
