import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { createPostgresConnection } from "./connection";

export type DatabaseClient = PostgresJsDatabase<typeof schema>;

export function createDatabaseClient(connectionString: string): DatabaseClient {
  const sql = createPostgresConnection(connectionString);

  return drizzle(sql, { schema });
}
