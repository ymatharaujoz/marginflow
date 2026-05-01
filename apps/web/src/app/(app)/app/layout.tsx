import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppLayoutClient } from "@/components/app-shell";
import { readServerAuthState } from "@/lib/server-auth";

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
  const authState = await readServerAuthState();

  if (!authState) {
    redirect("/sign-in");
  }

  return (
    <AppLayoutClient
      user={{
        email: authState.user.email,
        image: authState.user.image,
        name: authState.user.name,
      }}
      organization={{
        name: authState.organization.name,
      }}
    >
      {children}
    </AppLayoutClient>
  );
}
