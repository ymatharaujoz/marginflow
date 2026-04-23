import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module";
import {
  readApiEnv,
  readTrustedOriginList,
  type ApiRuntimeEnv,
} from "@/common/config/api-env";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { AUTH_INSTANCE } from "@/common/tokens";

export async function buildApp(
  env: ApiRuntimeEnv = readApiEnv(),
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(env),
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  await app.register(cors, {
    credentials: true,
    origin: readTrustedOriginList(env),
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());

  await app.init();

  const fastify = app.getHttpAdapter().getInstance();
  const authHandler = toNodeHandler(app.get(AUTH_INSTANCE) as Parameters<typeof toNodeHandler>[0]);

  fastify.route({
    method: ["GET", "POST"],
    url: "/auth/*",
    async handler(request, reply) {
      reply.hijack();
      await authHandler(request.raw, reply.raw);
    },
  });

  await app.getHttpAdapter().getInstance().ready();

  return app;
}
