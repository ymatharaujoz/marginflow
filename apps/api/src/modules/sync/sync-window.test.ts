import { describe, expect, it } from "vitest";
import { resolveSyncWindowState, resolveSyncWindowStateAtNextOpenHour } from "./sync-window";

describe("resolveSyncWindowState", () => {
  it("blocks sync before the morning window starts", () => {
    const state = resolveSyncWindowState(new Date("2026-05-01T08:30:00.000Z"));

    expect(state.syncOpen).toBe(false);
    expect(state.currentWindowKey).toBeNull();
    expect(state.nextAvailableAt).toBe("2026-05-01T09:00:00.000Z");
  });

  it("returns the morning window key during the first window", () => {
    const state = resolveSyncWindowState(new Date("2026-05-01T12:30:00.000Z"));

    expect(state.syncOpen).toBe(true);
    expect(state.currentWindowKey).toBe("2026-05-01:morning");
    expect(state.nextAvailableAt).toBe("2026-05-01T15:00:00.000Z");
  });

  it("returns the evening rollover after the last window", () => {
    const state = resolveSyncWindowState(new Date("2026-05-02T01:15:00.000Z"));

    expect(state.syncOpen).toBe(true);
    expect(state.currentWindowKey).toBe("2026-05-01:evening");
    expect(state.nextAvailableAt).toBe("2026-05-02T09:00:00.000Z");
  });
});

describe("resolveSyncWindowStateAtNextOpenHour", () => {
  it("advances from overnight closure to the next open window", () => {
    const state = resolveSyncWindowStateAtNextOpenHour(new Date("2026-05-01T08:30:00.000Z"));

    expect(state.syncOpen).toBe(true);
    expect(state.currentWindowKey).not.toBeNull();
  });
});
