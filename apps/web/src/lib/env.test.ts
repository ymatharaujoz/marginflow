import { describe, expect, it } from "vitest";
import { getWebEnv, readPublicEnv } from "@/lib/env";

describe("readPublicEnv", () => {
  it("accepts complete public environment", () => {
    const env = readPublicEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
    });

    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe("http://localhost:4000");
  });

  it("rejects missing public api base url", () => {
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_BASE_URL: undefined,
      }),
    ).toThrow();
  });

  it("reads process-like sources through helper", () => {
    const env = getWebEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000",
    });

    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });
});
