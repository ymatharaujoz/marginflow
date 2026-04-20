import { DynamicModule, Global, Module } from "@nestjs/common";
import { HealthModule } from "@/modules/health/health.module";
import { API_RUNTIME_ENV } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";

@Global()
@Module({})
export class AppModule {
  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [HealthModule],
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
