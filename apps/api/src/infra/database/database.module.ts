import {
  DynamicModule,
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
} from "@nestjs/common";
import { createDatabaseRuntime, type DatabaseRuntime } from "@marginflow/database";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { DATABASE_CLIENT, DATABASE_RUNTIME } from "@/common/tokens";

@Global()
@Module({})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE_RUNTIME)
    private readonly runtime: DatabaseRuntime,
  ) {}

  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_RUNTIME,
          useFactory: () =>
            createDatabaseRuntime(env.DATABASE_URL, {
              max: env.API_DB_POOL_MAX,
            }),
        },
        {
          provide: DATABASE_CLIENT,
          inject: [DATABASE_RUNTIME],
          useFactory: (runtime: DatabaseRuntime) => runtime.db,
        },
      ],
      exports: [DATABASE_CLIENT, DATABASE_RUNTIME],
    };
  }

  async onApplicationShutdown() {
    await this.runtime.close();
  }
}
