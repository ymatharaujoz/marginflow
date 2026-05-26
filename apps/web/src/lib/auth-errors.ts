const AUTH_ERROR_MESSAGES = {
  oauth_complete_failed: "Nao foi possivel concluir o login com Google. Tente de novo.",
  oauth_start_failed: "Nao foi possivel iniciar o login com Google. Tente de novo.",
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
