import { describe, expect, it } from "vitest";

import { SEED_USER_ID_ERROR, readSeedUserId } from "./seed-config";

describe("readSeedUserId", () => {
  it("reads the seed user id from env", () => {
    expect(readSeedUserId({ SEED_USER_ID: "  user_123  " })).toBe("user_123");
  });

  it("fails fast when the seed user id is missing", () => {
    expect(() => readSeedUserId({})).toThrow(SEED_USER_ID_ERROR);
  });
});
