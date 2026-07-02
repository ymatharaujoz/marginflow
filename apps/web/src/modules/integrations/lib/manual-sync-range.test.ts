import { describe, expect, it } from "vitest";
import {
  buildManualSyncPayload,
  getManualSyncDateBounds,
  validateManualSyncRange,
} from "./manual-sync-range";

describe("getManualSyncDateBounds", () => {
  it("returns a 60-day inclusive window ending today", () => {
    expect(getManualSyncDateBounds("2026-07-02T12:00:00.000Z")).toEqual({
      maxDate: "2026-07-02",
      minDate: "2026-05-03",
    });
  });
});

describe("validateManualSyncRange", () => {
  it("accepts ranges anywhere within the last 60 days", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-06-30",
        startDate: "2026-06-01",
      },
      "2026-07-02T12:00:00.000Z",
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects ranges older than the rolling 60-day window", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-05-10",
        startDate: "2026-05-02",
      },
      "2026-07-02T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("ultimos 60 dias");
  });

  it("rejects intervals longer than 60 days", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-07-02",
        startDate: "2026-05-02",
      },
      "2026-07-02T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceder 60 dias");
  });

  it("rejects end dates in the future", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-07-03",
        startDate: "2026-06-10",
      },
      "2026-07-02T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("ultimos 60 dias");
  });

  it("accepts exact 60-day inclusive ranges", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-07-02",
        startDate: "2026-05-03",
      },
      "2026-07-02T12:00:00.000Z",
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects the day beyond an exact 60-day inclusive range", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-07-02",
        startDate: "2026-05-02",
      },
      "2026-07-02T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceder 60 dias");
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
