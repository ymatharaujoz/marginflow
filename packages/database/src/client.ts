import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "./schema";
import { createPostgresConnection } from "./connection";

export type DatabaseClient = PostgresJsDatabase<typeof schema>;

export function createDatabaseClient(connection: string | Sql): DatabaseClient {
  const sql =
    typeof connection === "string" ? createPostgresConnection(connection) : connection;

  return drizzle(sql, { schema });
}
