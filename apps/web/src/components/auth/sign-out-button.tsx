"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@lucreii/ui";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setIsSubmitting(true);
    await authClient.signOut().catch(() => undefined);
    await fetch("/auth/logout", {
      method: "POST",
    }).catch(() => undefined);
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button
      disabled={isSubmitting}
      loading={isSubmitting}
      onClick={handleSignOut}
      size="sm"
      variant="ghost"
    >
      Sair
    </Button>
  );
}
