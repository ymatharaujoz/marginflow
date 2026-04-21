import postgres from "postgres";

export function createPostgresConnection(connectionString: string) {
  return postgres(connectionString, {
    max: 1,
    prepare: false,
  });
}
