import type {
  SignInWithPasswordInput,
  SignUpWithPasswordFormInput,
} from "@lucreii/validation";
import {
  signInWithPasswordSchema,
  signUpWithPasswordFormSchema,
} from "@lucreii/validation";
import { buildAuthFinalizeUrl } from "./auth-client";
import { resolveAuthInlineErrorMessage } from "./auth-errors";

type AuthResult = {
  data?: unknown;
  error?: unknown;
};

type PasswordAuthClient = {
  signIn: {
    email(input: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }): Promise<AuthResult>;
  };
  signUp: {
    email(input: {
      email: string;
      name: string;
      password: string;
    }): Promise<AuthResult>;
  };
};

type SubmitPasswordAuthInput =
  | {
      apiBaseUrl: string;
      authClient: PasswordAuthClient;
      locationAssign: (url: string) => void;
      mode: "sign-in";
      nextPath?: string;
      values: SignInWithPasswordInput;
    }
  | {
      apiBaseUrl: string;
      authClient: PasswordAuthClient;
      locationAssign: (url: string) => void;
      mode: "sign-up";
      nextPath?: string;
      values: SignUpWithPasswordFormInput;
    };

export async function submitPasswordAuth(input: SubmitPasswordAuthInput) {
  if (input.mode === "sign-in") {
    const validation = signInWithPasswordSchema.safeParse(input.values);

    if (!validation.success) {
      return {
        inlineError: validation.error.issues[0]?.message ?? "Confira dados informados.",
        success: false as const,
      };
    }

    try {
      const result = await input.authClient.signIn.email({
        email: validation.data.email,
        password: validation.data.password,
        rememberMe: true,
      });

      if (result?.error) {
        return {
          inlineError: resolveAuthInlineErrorMessage(result.error),
          success: false as const,
        };
      }

      input.locationAssign(buildAuthFinalizeUrl(input.apiBaseUrl, input.nextPath ?? "/app"));

      return {
        inlineError: null,
        success: true as const,
      };
    } catch (error) {
      return {
        inlineError: resolveAuthInlineErrorMessage(error),
        success: false as const,
      };
    }
  }

  const validation = signUpWithPasswordFormSchema.safeParse(input.values);

  if (!validation.success) {
    return {
      inlineError: validation.error.issues[0]?.message ?? "Confira dados informados.",
      success: false as const,
    };
  }

  try {
    const result = await input.authClient.signUp.email({
      email: validation.data.email,
      name: validation.data.name,
      password: validation.data.password,
    });

    if (result?.error) {
      return {
        inlineError: resolveAuthInlineErrorMessage(result.error),
        success: false as const,
      };
    }

    input.locationAssign(buildAuthFinalizeUrl(input.apiBaseUrl, input.nextPath ?? "/app"));

    return {
      inlineError: null,
      success: true as const,
    };
  } catch (error) {
    return {
      inlineError: resolveAuthInlineErrorMessage(error),
      success: false as const,
    };
  }
}
