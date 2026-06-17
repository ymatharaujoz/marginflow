import { describe, expect, it, vi } from "vitest";
import { submitPasswordAuth } from "./auth-flow";

describe("submitPasswordAuth", () => {
  it("returns validation errors before calling remote sign-in", async () => {
    const signInEmail = vi.fn();

    const result = await submitPasswordAuth({
      appBaseUrl: "https://www.lucreii.com.br",
      apiBaseUrl: "https://marginflow-production.up.railway.app",
      authClient: {
        signIn: { email: signInEmail },
        signUp: { email: vi.fn() },
      },
      locationAssign: vi.fn(),
      mode: "sign-in",
      values: {
        email: "invalid",
        password: "123",
      },
    });

    expect(signInEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      inlineError: "Informe um e-mail válido",
      success: false,
    });
  });

  it("signs in with email/password then redirects to web auth completion", async () => {
    const signInEmail = vi.fn().mockResolvedValue({
      data: {
        sessionId: "session_123",
        ticket: "ticket_sign_in_123_ticket",
      },
      error: null,
    });
    const locationAssign = vi.fn();

    const result = await submitPasswordAuth({
      appBaseUrl: "https://www.lucreii.com.br",
      apiBaseUrl: "https://marginflow-production.up.railway.app",
      authClient: {
        signIn: { email: signInEmail },
        signUp: { email: vi.fn() },
      },
      locationAssign,
      mode: "sign-in",
      values: {
        email: "owner@lucreii.local",
        password: "password123",
      },
    });

    expect(signInEmail).toHaveBeenCalledWith({
      email: "owner@lucreii.local",
      password: "password123",
      rememberMe: true,
    });
    expect(locationAssign).toHaveBeenCalledWith(
      "https://www.lucreii.com.br/auth/complete?ticket=ticket_sign_in_123_ticket&next=%2Fapp",
    );
    expect(result).toEqual({
      inlineError: null,
      success: true,
    });
  });

  it("signs up with name, email and password then redirects to web auth completion", async () => {
    const signUpEmail = vi.fn().mockResolvedValue({
      data: {
        sessionId: "session_123",
        ticket: "ticket_sign_up_123_ticket",
      },
      error: null,
    });
    const locationAssign = vi.fn();

    const result = await submitPasswordAuth({
      appBaseUrl: "https://www.lucreii.com.br",
      apiBaseUrl: "https://marginflow-production.up.railway.app",
      authClient: {
        signIn: { email: vi.fn() },
        signUp: { email: signUpEmail },
      },
      locationAssign,
      mode: "sign-up",
      values: {
        email: "owner@lucreii.local",
        name: "Mateus",
        password: "password123",
        confirmPassword: "password123",
      },
    });

    expect(signUpEmail).toHaveBeenCalledWith({
      email: "owner@lucreii.local",
      name: "Mateus",
      password: "password123",
    });
    expect(locationAssign).toHaveBeenCalledWith(
      "https://www.lucreii.com.br/auth/complete?ticket=ticket_sign_up_123_ticket&next=%2Fapp",
    );
    expect(result).toEqual({
      inlineError: null,
      success: true,
    });
  });

  it("returns generic mapped inline errors from Better Auth", async () => {
    const signInEmail = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Invalid email or password",
      },
    });

    const result = await submitPasswordAuth({
      appBaseUrl: "https://www.lucreii.com.br",
      apiBaseUrl: "https://marginflow-production.up.railway.app",
      authClient: {
        signIn: { email: signInEmail },
        signUp: { email: vi.fn() },
      },
      locationAssign: vi.fn(),
      mode: "sign-in",
      values: {
        email: "owner@lucreii.local",
        password: "password123",
      },
    });

    expect(result).toEqual({
      inlineError: "E-mail ou senha inválidos",
      success: false,
    });
  });
});
