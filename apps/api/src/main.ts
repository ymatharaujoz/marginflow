import "./common/config/monorepo-env";
import "reflect-metadata";
import { buildApp } from "./app";
import { readApiEnv } from "@/common/config/api-env";

async function bootstrap() {
  const env = readApiEnv();
  const app = await buildApp(env);

  await app.listen({
    host: env.API_HOST,
    port: env.API_PORT,
  });
}

void bootstrap();
