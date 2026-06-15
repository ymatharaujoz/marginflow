import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { AppModule } from "./app.module";
import {
  readApiEnv,
  readMercadoLivreOauthWarnings,
  readTrustedOriginList,
  type ApiRuntimeEnv,
} from "@/common/config/api-env";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import {
  buildAbsoluteRequestUrl,
  buildWebAuthCompleteRedirectUrl,
  readApiSessionTokenFromCookieHeader,
  sanitizeNextPath,
} from "@/modules/auth/auth-http";
import { AuthExchangeService } from "@/modules/auth/auth-exchange.service";
import { AuthService } from "@/modules/auth/auth.service";

export async function buildApp(
  env: ApiRuntimeEnv = readApiEnv(),
): Promise<NestFastifyApplication> {
  for (const warning of readMercadoLivreOauthWarnings(env)) {
    console.warn("[lucreii/api] Mercado Livre OAuth warning.", { warning });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(env),
    new FastifyAdapter(),
    {
      bufferLogs: true,
      rawBody: true,
    },
  );

  await app.register(cors, {
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    origin: readTrustedOriginList(env),
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());

  await app.init();

  const fastify = app.getHttpAdapter().getInstance();
  const authExchangeService = app.get(AuthExchangeService);
  const authService = app.get(AuthService);

  fastify.route({
    method: "GET",
    url: "/auth/finalize",
    async handler(request, reply) {
      const nextPath =
        typeof request.query === "object" &&
        request.query !== null &&
        "next" in request.query &&
        typeof request.query.next === "string"
          ? sanitizeNextPath(request.query.next)
          : "/app";
      const sessionToken = readApiSessionTokenFromCookieHeader(request.headers.cookie);

      if (!sessionToken) {
        console.error("[lucreii/api] Internal auth finalize missing session cookie.", {
          nextPath,
          origin: buildAbsoluteRequestUrl(request).origin,
          path: request.url,
        });
        reply.status(303);
        reply.header("location", `${env.WEB_APP_ORIGIN}/sign-in?auth_error=auth_handoff_failed`);
        return reply.send();
      }

      const authContext = await authService.resolveRequestContext({
        headers: request.headers,
      });

      if (!authContext) {
        console.error("[lucreii/api] Internal auth finalize could not resolve session context.", {
          nextPath,
          origin: buildAbsoluteRequestUrl(request).origin,
          path: request.url,
        });
        reply.status(303);
        reply.header("location", `${env.WEB_APP_ORIGIN}/sign-in?auth_error=auth_handoff_failed`);
        return reply.send();
      }

      const ticket = await authExchangeService.createTicket({
        organizationId: authContext.organization?.id ?? null,
        remoteSessionToken: sessionToken,
        sessionId: authContext.session.id,
        userId: authContext.user.id,
      });
      const redirectUrl = buildWebAuthCompleteRedirectUrl({
        nextPath,
        ticket,
        webAppOrigin: env.WEB_APP_ORIGIN,
      });

      console.info("[lucreii/api] Internal auth finalize redirected to web handoff.", {
        origin: buildAbsoluteRequestUrl(request).origin,
        path: request.url,
        redirectUrl,
      });

      reply.status(303);
      reply.header("location", redirectUrl);
      return reply.send();
    },
  });

  await app.getHttpAdapter().getInstance().ready();

  return app;
}
