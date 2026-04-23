"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@marginflow/ui";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setIsSubmitting(true);
    const result = await authClient.signOut();

    if (result.error) {
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Button disabled={isSubmitting} onClick={handleSignOut} variant="secondary">
      {isSubmitting ? "Signing out..." : "Sign out"}
    </Button>
  );
}
