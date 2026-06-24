import { describe, expect, it } from "vitest";
import {
  buildManualSyncPayload,
  validateManualSyncRange,
} from "./manual-sync-range";

describe("validateManualSyncRange", () => {
  it("accepts ranges within the last 30 days and at most one month long", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-06-20",
        startDate: "2026-06-10",
      },
      "2026-06-22T12:00:00.000Z",
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects ranges older than the rolling 30-day window", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-05-22",
        startDate: "2026-05-20",
      },
      "2026-06-22T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("30 dias");
  });

  it("rejects ranges longer than one month", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-03-01",
        startDate: "2026-01-30",
      },
      "2026-03-01T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("1 mês");
  });

  it("builds sync payload with provider and selected dates", () => {
    expect(
      buildManualSyncPayload("mercadolivre", {
        endDate: "2026-06-20",
        startDate: "2026-06-10",
      }),
    ).toEqual({
      endDate: "2026-06-20",
      provider: "mercadolivre",
      startDate: "2026-06-10",
    });
  });
});
