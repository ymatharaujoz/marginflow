import postgres, { type Options, type Sql } from "postgres";

export type PostgresConnectionOptions = Pick<
  Options<Record<string, postgres.PostgresType>>,
  "max"
>;

export function createPostgresConnection(
  connectionString: string,
  options: PostgresConnectionOptions = {},
): Sql {
  return postgres(connectionString, {
    max: options.max ?? 10,
    prepare: false,
  });
}
