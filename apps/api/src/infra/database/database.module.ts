import { DynamicModule, Module } from "@nestjs/common";
import { createDatabaseClient } from "@marginflow/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { DATABASE_CLIENT } from "@/common/tokens";

@Module({})
export class DatabaseModule {
  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_CLIENT,
          useFactory: () => createDatabaseClient(env.DATABASE_URL),
        },
      ],
      exports: [DATABASE_CLIENT],
    };
  }
}
