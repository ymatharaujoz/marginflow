import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppLayoutClient } from "@/components/app-shell";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";
import { hasSubscriptionForProtectedApp } from "@/lib/protected-app-route";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  if (!authState) {
    redirect("/sign-in");
  }

  const hasSubscription = hasSubscriptionForProtectedApp(billingState);

  return (
    <AppLayoutClient
      user={{
        email: authState.user.email,
        image: authState.user.image,
        name: authState.user.name,
      }}
      organization={{
        name: authState.organization?.name ?? "Novo workspace",
      }}
      hasSubscription={hasSubscription}
    >
      {children}
    </AppLayoutClient>
  );
}
