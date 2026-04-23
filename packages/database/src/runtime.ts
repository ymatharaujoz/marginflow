import type { Sql } from "postgres";
import { createDatabaseClient, type DatabaseClient } from "./client";
import { createPostgresConnection } from "./connection";
import type { PostgresConnectionOptions } from "./connection";

export type DatabaseRuntime = {
  close(): Promise<void>;
  db: DatabaseClient;
  sql: Sql;
};

export type DatabaseRuntimeOptions = PostgresConnectionOptions;

export function createDatabaseRuntime(
  connectionString: string,
  options: DatabaseRuntimeOptions = {},
): DatabaseRuntime {
  const sql = createPostgresConnection(connectionString, options);

  return {
    db: createDatabaseClient(sql),
    sql,
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
