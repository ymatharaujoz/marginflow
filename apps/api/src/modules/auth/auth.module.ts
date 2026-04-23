import { DynamicModule, Module } from "@nestjs/common";
import type { DatabaseClient } from "@marginflow/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { AUTH_INSTANCE, DATABASE_CLIENT } from "@/common/tokens";
import { AuthStateController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { buildBetterAuth } from "./better-auth.provider";
import { OrganizationProvisioningService } from "./organization-provisioning.service";

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
          useFactory: (db: DatabaseClient) => buildBetterAuth(db, env),
        },
        OrganizationProvisioningService,
        AuthService,
        AuthGuard,
      ],
      exports: [AUTH_INSTANCE, AuthGuard, AuthService],
    };
  }
}
