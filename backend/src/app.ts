import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import path from "node:path";
import { env, corsOrigins } from "./config/env.js";
import { HttpError } from "./common/http-error.js";
import { prisma } from "./db/prisma.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerTelegramRoutes } from "./modules/telegram/telegram.routes.js";
import { registerCatalogRoutes } from "./modules/catalog/catalog.routes.js";
import { registerUserRoutes } from "./modules/users/users.routes.js";
import { registerOrderRoutes } from "./modules/orders/orders.routes.js";
import { registerAdminRoutes } from "./modules/admin/admin.routes.js";
import { registerMediaRoutes } from "./modules/media/media.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    if (!body) {
      done(null, {});
      return;
    }

    try {
      done(null, JSON.parse(body as string));
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"), false);
    },
    credentials: true,
  });
  await app.register(multipart);
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "uploads"),
    prefix: "/uploads/",
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    const anyError = error as { validation?: unknown };
    if (anyError.validation) {
      reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: anyError.validation,
        },
      });
      return;
    }

    app.log.error(error);
    reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  });

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { data: { status: "ok", version: "0.1.0" } };
  });

  await registerAuthRoutes(app);
  await registerTelegramRoutes(app);
  await registerCatalogRoutes(app);
  await registerUserRoutes(app);
  await registerOrderRoutes(app);
  await registerAdminRoutes(app);
  await registerMediaRoutes(app);

  return app;
}
