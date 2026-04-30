import { DynamicModule, Global, Module } from "@nestjs/common";
import { HealthModule } from "@/modules/health/health.module";
import { API_RUNTIME_ENV } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { DatabaseModule } from "@/infra";
import { AuthModule } from "@/modules/auth/auth.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { DashboardModule } from "@/modules/dashboard/dashboard.module";
import { FinanceModule } from "@/modules/finance/finance.module";
import { IntegrationsModule } from "@/modules/integrations/integrations.module";
import { ProductsModule } from "@/modules/products/products.module";
import { SyncModule } from "@/modules/sync/sync.module";

@Global()
@Module({})
export class AppModule {
  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DatabaseModule.register(env),
        AuthModule.register(env),
        BillingModule.register(env),
        DashboardModule,
        FinanceModule,
        IntegrationsModule,
        ProductsModule,
        SyncModule,
        HealthModule,
      ],
      providers: [
        {
          provide: API_RUNTIME_ENV,
          useValue: env,
        },
      ],
      exports: [API_RUNTIME_ENV],
    };
  }
}
