import { DynamicModule, Global, Module } from "@nestjs/common";
import Stripe from "stripe";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { STRIPE_CLIENT } from "@/common/tokens";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { EntitlementGuard } from "./entitlement.guard";
import { EntitlementsService } from "./entitlements.service";

@Global()
@Module({})
export class BillingModule {
  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: BillingModule,
      controllers: [BillingController],
      providers: [
        {
          provide: STRIPE_CLIENT,
          useFactory: () => new Stripe(env.STRIPE_SECRET_KEY),
        },
        BillingService,
        EntitlementsService,
        EntitlementGuard,
      ],
      exports: [BillingService, EntitlementsService, EntitlementGuard, STRIPE_CLIENT],
    };
  }
}
