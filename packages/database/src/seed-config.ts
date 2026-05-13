export const SEED_USER_ID_ERROR = "SEED_USER_ID is required for database seed.";

export function readSeedUserId(source: Record<string, string | undefined> = process.env) {
  const userId = source.SEED_USER_ID?.trim();

  if (!userId) {
    throw new Error(SEED_USER_ID_ERROR);
  }

  return userId;
}
