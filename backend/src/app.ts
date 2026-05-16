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
import { registerPaymentRoutes } from "./modules/payments/payments.routes.js";
import { startCryptoPaymentWatcher } from "./modules/payments/crypto-payments.service.js";
import { registerAddressRoutes } from "./modules/addresses/addresses.routes.js";

export async function buildApp() {
  const app = Fastify({
    bodyLimit: 110 * 1024 * 1024,
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
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 100 * 1024 * 1024,
    },
  });
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "uploads"),
    prefix: "/uploads/",
    maxAge: "30d",
    immutable: true,
    setHeaders: (response, filePath) => {
      if (/\.(mp4|webm)$/i.test(filePath)) {
        response.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        response.setHeader("Accept-Ranges", "bytes");
      }
    },
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

    const anyError = error as { code?: string; validation?: unknown };
    if (anyError.code === "FST_REQ_FILE_TOO_LARGE") {
      reply.status(413).send({
        error: {
          code: "FILE_TOO_LARGE",
          message: "File is too large",
        },
      });
      return;
    }

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
  await registerAddressRoutes(app);
  await registerAdminRoutes(app);
  await registerMediaRoutes(app);
  await registerPaymentRoutes(app);
  startCryptoPaymentWatcher(app);

  return app;
}
