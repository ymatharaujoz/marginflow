/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignInPanel } from "./sign-in-panel";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn() },
    signOut: vi.fn(),
    signUp: { email: vi.fn() },
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SignInPanel", () => {
  it("renders internal credential form", () => {
    const view = mount(<SignInPanel />);

    expect(document.body.textContent).toContain("Acesse sua conta");
    expect(document.body.textContent).toContain("Entrar");
    expect(document.body.textContent).toContain("E-mail");
    expect(document.body.textContent).toContain("Senha");
    expect(document.body.textContent).toContain("Criar conta");
    expect(document.querySelector('[aria-label="Mostrar senha"]')).not.toBeNull();

    view.unmount();
  });

  it("renders auth error message passed from sign-in page", () => {
    const view = mount(
      <SignInPanel initialErrorMessage="Não foi possível concluir a autenticação. Tente novamente mais tarde." />,
    );

    expect(document.body.textContent).toContain(
      "Não foi possível concluir a autenticação. Tente novamente mais tarde.",
    );

    view.unmount();
  });

  it("switches to sign-up mode and shows confirm password field", () => {
    const view = mount(<SignInPanel />);

    const signUpButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Criar conta",
    );

    expect(signUpButton).toBeDefined();
    click(signUpButton!);

    expect(document.body.textContent).toContain("Crie sua conta");
    expect(document.body.textContent).toContain("Confirmar senha");
    expect(document.body.textContent).toContain("Nome");

    view.unmount();
  });

  it("clears fields when switching between modes", () => {
    const view = mount(<SignInPanel />);

    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    act(() => {
      emailInput.value = "test@example.com";
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      passwordInput.value = "password123";
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const signUpButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Criar conta",
    );
    click(signUpButton!);

    const switchedEmailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const switchedPasswordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    expect(switchedEmailInput.value).toBe("");
    expect(switchedPasswordInput.value).toBe("");

    view.unmount();
  });
});
