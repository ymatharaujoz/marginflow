import { describe, expect, it } from "vitest";
import {
  signInWithPasswordSchema,
  signUpWithPasswordFormSchema,
  signUpWithPasswordSchema,
} from "./auth";

describe("@marginflow/validation auth schemas", () => {
  it("rejects invalid sign-in payloads", () => {
    const result = signInWithPasswordSchema.safeParse({
      email: "invalid",
      password: "123",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Informe um e-mail válido",
      "Senha deve ter pelo menos 8 caracteres.",
    ]);
  });

  it("requires name for sign-up payloads", () => {
    const result = signUpWithPasswordSchema.safeParse({
      email: "owner@marginflow.local",
      name: "",
      password: "password123",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Informe seu nome.");
  });

  it("requires confirm password for sign-up form payloads", () => {
    const result = signUpWithPasswordFormSchema.safeParse({
      email: "owner@marginflow.local",
      name: "Mateus",
      password: "password123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects sign-up form payloads when passwords do not match", () => {
    const result = signUpWithPasswordFormSchema.safeParse({
      email: "owner@marginflow.local",
      name: "Mateus",
      password: "password123",
      confirmPassword: "different123",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("As senhas não coincidem");
  });
});
