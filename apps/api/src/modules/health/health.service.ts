import { Inject, Injectable } from "@nestjs/common";
import { API_RUNTIME_ENV } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";

@Injectable()
export class HealthService {
  constructor(
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
  ) {}

  getHealth() {
    return {
      data: {
        corsOrigin: this.env.WEB_APP_ORIGIN,
        service: "marginflow-api",
        status: "ok" as const,
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }
}
