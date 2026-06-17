import { describe, expect, it } from "vitest";
import {
  resolveAuthErrorMessage,
  resolveAuthInlineErrorMessage,
} from "./auth-errors";

describe("resolveAuthErrorMessage", () => {
  it("maps generic auth handoff errors", () => {
    expect(resolveAuthErrorMessage("auth_handoff_failed")).toBe(
      "Não foi possível concluir a autenticação. Tente novamente mais tarde.",
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
