const AUTH_ERROR_MESSAGES = {
  auth_handoff_failed: "Nao foi possivel concluir autenticacao. Tente de novo.",
  web_session_not_persisted:
    "Seu login foi concluido, mas a sessao do app nao foi salva. Tente novamente.",
} as const;

export function resolveAuthErrorMessage(
  authError: string | string[] | undefined,
): string | null {
  const errorCode = Array.isArray(authError) ? authError[0] : authError;

  if (!errorCode) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[errorCode as keyof typeof AUTH_ERROR_MESSAGES] ?? null;
}

export function resolveAuthInlineErrorMessage(authError: unknown): string {
  const rawMessage =
    typeof authError === "string"
      ? authError
      : authError && typeof authError === "object" && "message" in authError && typeof authError.message === "string"
        ? authError.message
        : null;

  if (!rawMessage) {
    return "Nao foi possivel concluir autenticacao. Tente de novo.";
  }

  const normalized = rawMessage.trim().toLowerCase();

  if (
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("wrong password")
  ) {
    return "E-mail ou senha inválidos";
  }

  if (
    normalized.includes("user already exists") ||
    normalized.includes("already registered") ||
    normalized.includes("email already")
  ) {
    return "Já existe conta com este e-mail";
  }

  return rawMessage;
}
