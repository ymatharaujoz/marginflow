import type { ServerAuthState } from "@/lib/server-auth";
import type { ServerBillingState } from "@/lib/server-billing";

/**
 * Assinatura válida para usar a área /app (escolher plano já foi resolvido).
 * - `active`: assinatura ativa/trial vinculada à organização.
 * - `pending_onboarding`: checkout confirmado no Stripe; workspace ainda não existe (criar em seguida).
 */
export function hasSubscriptionForProtectedApp(billingState: ServerBillingState | null) {
  return (
    billingState?.status === "active" || billingState?.status === "pending_onboarding"
  );
}

/**
 * Fluxo: sem assinatura → /app/billing; com assinatura e sem org → /app/onboarding; caso contrário segue na rota.
 */
export function resolveProtectedAppRedirect(
  authState: ServerAuthState | null,
  billingState: ServerBillingState | null,
) {
  if (!authState) {
    return "/sign-in";
  }

  if (!hasSubscriptionForProtectedApp(billingState)) {
    return "/app/billing";
  }

  if (!authState.organization) {
    return "/app/onboarding";
  }

  return null;
}
