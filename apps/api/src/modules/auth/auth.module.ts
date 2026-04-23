import { DynamicModule, Module } from "@nestjs/common";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { DatabaseClient } from "@marginflow/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { AUTH_INSTANCE, DATABASE_CLIENT } from "@/common/tokens";
import { AuthStateController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";

function parseTrustedOrigins(env: ApiRuntimeEnv) {
  const configuredOrigins = env.AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([env.WEB_APP_ORIGIN, ...(configuredOrigins ?? [])]));
}

@Module({})
export class AuthModule {
  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: AuthModule,
      controllers: [AuthStateController],
      providers: [
        {
          provide: AUTH_INSTANCE,
          inject: [DATABASE_CLIENT],
          useFactory: (db: DatabaseClient) =>
            betterAuth({
              baseURL: env.BETTER_AUTH_URL,
              secret: env.BETTER_AUTH_SECRET,
              database: drizzleAdapter(db, {
                provider: "pg",
              }),
              trustedOrigins: parseTrustedOrigins(env),
              socialProviders: {
                google: {
                  clientId: env.GOOGLE_CLIENT_ID,
                  clientSecret: env.GOOGLE_CLIENT_SECRET,
                },
              },
            }),
        },
        AuthService,
        AuthGuard,
      ],
      exports: [AUTH_INSTANCE, AuthGuard, AuthService],
    };
  }
}
