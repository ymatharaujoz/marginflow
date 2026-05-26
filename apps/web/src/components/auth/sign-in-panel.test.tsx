import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SignInPanel } from "./sign-in-panel";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: null,
      error: null,
      isPending: false,
    }),
  },
  buildGoogleAuthStartUrl: vi.fn(() => "https://marginflow-production.up.railway.app/auth/start/google"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("SignInPanel", () => {
  it("renders the oauth start error message passed from the sign-in page", () => {
    const markup = renderToStaticMarkup(
      <SignInPanel initialErrorMessage="Não foi possível iniciar o login com Google. Tente de novo." />,
    );

    expect(markup).toContain("Não foi possível iniciar o login com Google. Tente de novo.");
  });
});
