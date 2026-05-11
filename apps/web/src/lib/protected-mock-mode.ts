type ProtectedMockEnv = {
  NEXT_PUBLIC_USE_MOCK_DATA?: string;
  NODE_ENV?: string;
};

/**
 * Modo demo para dados de UI (ex.: métricas mock no cliente). Não altera gating de
 * assinatura no servidor — isso vem de `readServerBillingState()` → API.
 */
export function isProtectedMockModeEnabled(env: ProtectedMockEnv = process.env) {
  return env.NODE_ENV !== "production" && env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
}
