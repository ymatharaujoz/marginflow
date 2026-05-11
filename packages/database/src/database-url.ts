const DATABASE_URL_ERROR = "DATABASE_URL is required for database runtime.";
const DATABASE_MIGRATION_URL_ERROR =
  "DATABASE_MIGRATION_URL or DATABASE_URL is required for database tooling.";

export function readRuntimeDatabaseUrl(source: Record<string, string | undefined> = process.env) {
  const connectionString = source.DATABASE_URL;

  if (!connectionString) {
    throw new Error(DATABASE_URL_ERROR);
  }

  return connectionString;
}

export function readMigrationDatabaseUrl(
  source: Record<string, string | undefined> = process.env,
) {
  const connectionString = source.DATABASE_MIGRATION_URL ?? source.DATABASE_URL;

  if (!connectionString) {
    throw new Error(DATABASE_MIGRATION_URL_ERROR);
  }

  return connectionString;
}

export { DATABASE_MIGRATION_URL_ERROR, DATABASE_URL_ERROR };
