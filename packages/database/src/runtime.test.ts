import { describe, expect, it } from "vitest";
import { createDatabaseRuntime } from "./runtime";

describe("@marginflow/database runtime", () => {
  it("creates runtime with configurable pool size", () => {
    const runtime = createDatabaseRuntime(
      "postgresql://postgres:postgres@localhost:5432/marginflow",
      {
        max: 3,
      },
    );

    expect(runtime.db.query.organizations).toBeDefined();
    expect(runtime.sql.options.max).toBe(3);
  });
});
