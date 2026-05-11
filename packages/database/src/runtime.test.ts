import { describe, expect, it } from "vitest";
import { createDatabaseRuntime } from "./runtime";

describe("@marginflow/database runtime", () => {
  it("creates runtime with configurable pool size", () => {
    const runtime = createDatabaseRuntime(
      "postgresql://postgres.project-ref:runtime-pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      {
        max: 3,
      },
    );

    expect(runtime.db.query.organizations).toBeDefined();
    expect(runtime.sql.options.max).toBe(3);
  });
});
