"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@marginflow/ui";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSubmitting(true);
    setMessage(null);
    const result = await authClient.signOut();

    if (result.error) {
      setMessage(result.error.message ?? "Sign out failed.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button disabled={isSubmitting} onClick={handleSignOut} variant="secondary">
        {isSubmitting ? "Signing out..." : "Sign out"}
      </Button>
      {message ? <p className="text-xs text-foreground-soft">{message}</p> : null}
    </div>
  );
}
