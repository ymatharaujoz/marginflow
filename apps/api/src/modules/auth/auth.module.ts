import { DynamicModule, Global, Module } from "@nestjs/common";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { AuthPublicController } from "./auth-public.controller";
import { AuthStateController } from "./auth.controller";
import { AuthExchangeService } from "./auth-exchange.service";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { OrganizationProvisioningService } from "./organization-provisioning.service";

@Global()
@Module({})
export class AuthModule {
  static register(_env: ApiRuntimeEnv): DynamicModule {
    return {
      module: AuthModule,
      controllers: [AuthPublicController, AuthStateController],
      providers: [
        OrganizationProvisioningService,
        AuthService,
        AuthExchangeService,
        AuthGuard,
      ],
      exports: [
        AuthExchangeService,
        AuthGuard,
        AuthService,
        OrganizationProvisioningService,
      ],
    };
  }
}
