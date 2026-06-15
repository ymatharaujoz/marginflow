import { z } from "zod";

const emailSchema = z.email("Informe um e-mail válido").transform((value) => value.trim().toLowerCase());
const passwordSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres.")
  .max(128, "Senha deve ter no maximo 128 caracteres.");

export const signInWithPasswordSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpWithPasswordSchema = signInWithPasswordSchema.extend({
  name: z.string().trim().min(1, "Informe seu nome.").max(255, "Nome deve ter no maximo 255 caracteres."),
});

export const signUpWithPasswordFormSchema = signUpWithPasswordSchema.extend({
  confirmPassword: passwordSchema,
}).refine((values) => values.password === values.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type SignInWithPasswordInput = z.infer<typeof signInWithPasswordSchema>;
export type SignUpWithPasswordInput = z.infer<typeof signUpWithPasswordSchema>;
export type SignUpWithPasswordFormInput = z.infer<typeof signUpWithPasswordFormSchema>;
