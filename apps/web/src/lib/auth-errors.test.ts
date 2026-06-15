import { describe, expect, it } from "vitest";
import {
  resolveAuthErrorMessage,
  resolveAuthInlineErrorMessage,
} from "./auth-errors";

describe("resolveAuthErrorMessage", () => {
  it("maps generic auth handoff errors without Google-specific copy", () => {
    expect(resolveAuthErrorMessage("auth_handoff_failed")).toBe(
      "Nao foi possivel concluir autenticacao. Tente de novo.",
    );
  });
});

describe("resolveAuthInlineErrorMessage", () => {
  it("maps invalid credentials errors", () => {
    expect(
      resolveAuthInlineErrorMessage({
        message: "Invalid email or password",
      }),
    ).toBe("E-mail ou senha inválidos");
  });

  it("maps existing email conflicts", () => {
    expect(
      resolveAuthInlineErrorMessage({
        message: "User already exists",
      }),
    ).toBe("Já existe conta com este e-mail");
  });
});
