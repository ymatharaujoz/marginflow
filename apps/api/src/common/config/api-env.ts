import { z } from "zod";

const apiEnvSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  WEB_APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ApiRuntimeEnv = z.infer<typeof apiEnvSchema>;

export function readApiEnv(
  source: Record<string, string | undefined> = process.env,
): ApiRuntimeEnv {
  return apiEnvSchema.parse({
    API_HOST: source.API_HOST,
    API_PORT: source.API_PORT,
    DATABASE_URL: source.DATABASE_URL,
    WEB_APP_ORIGIN: source.WEB_APP_ORIGIN ?? source.NEXT_PUBLIC_APP_URL,
    NODE_ENV: source.NODE_ENV,
  });
}
