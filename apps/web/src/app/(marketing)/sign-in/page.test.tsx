import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SignInPage, { metadata } from "./page";

const redirectMock = vi.hoisted(() => vi.fn());
const readServerAuthStateMock = vi.hoisted(() => vi.fn());
const resolveAuthErrorMessageMock = vi.hoisted(() => vi.fn(() => "friendly error"));
const signInPanelMock = vi.hoisted(() =>
  vi.fn(({ initialErrorMessage }: { initialErrorMessage?: string | null }) => (
    <div data-error={initialErrorMessage ?? ""}>sign-in-panel</div>
  )),
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/auth/sign-in-panel", () => ({
  SignInPanel: signInPanelMock,
}));

vi.mock("@/components/auth/particle-canvas", () => ({
  ParticleCanvas: () => <div>particle-canvas</div>,
}));

vi.mock("@/lib/auth-errors", () => ({
  resolveAuthErrorMessage: resolveAuthErrorMessageMock,
}));

vi.mock("@/lib/server-auth", () => ({
  readServerAuthState: readServerAuthStateMock,
}));

describe("SignInPage", () => {
  it("exposes metadata copy for internal email/password auth", () => {
    expect(String(metadata.description ?? "")).toContain("e-mail e senha");
  });

  it("renders sign-in panel when soft auth lookup returns null", async () => {
    readServerAuthStateMock.mockResolvedValueOnce(null);

    const result = await SignInPage({
      searchParams: Promise.resolve({
        auth_error: "auth_handoff_failed",
      }),
    });
    const markup = renderToStaticMarkup(result);

    expect(readServerAuthStateMock).toHaveBeenCalledWith({ mode: "soft" });
    expect(resolveAuthErrorMessageMock).toHaveBeenCalledWith("auth_handoff_failed");
    expect(redirectMock).not.toHaveBeenCalled();
    expect(markup).toContain("sign-in-panel");
    expect(signInPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialErrorMessage: "friendly error",
      }),
      undefined,
    );
  });

  it("redirects authenticated users to app", async () => {
    readServerAuthStateMock.mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });

    await SignInPage({});

    expect(redirectMock).toHaveBeenCalledWith("/app");
  });
});
