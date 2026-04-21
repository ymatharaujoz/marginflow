import { DynamicModule, Global, Module } from "@nestjs/common";
import { HealthModule } from "@/modules/health/health.module";
import { API_RUNTIME_ENV } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { DatabaseModule } from "@/infra";

@Global()
@Module({})
export class AppModule {
  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.register(env), HealthModule],
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
