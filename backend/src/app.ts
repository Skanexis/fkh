import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import path from "node:path";
import { Prisma } from "@prisma/client";
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

const devLocalHosts = new Set(["localhost", "127.0.0.1", "::1"]);

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

      if (env.NODE_ENV !== "production") {
        const host = parseOriginHost(origin);
        if (host && isDevHostAllowed(host)) {
          callback(null, true);
          return;
        }
      }

      callback(new HttpError(403, "CORS_ORIGIN_FORBIDDEN", "Origin is not allowed by CORS"), false);
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
      if (/\.(mp4|webm|mov)$/i.test(filePath)) {
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

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.status(409).send({
          error: {
            code: "UNIQUE_CONSTRAINT_VIOLATION",
            message: "Record with the same unique field already exists",
            details: error.meta,
          },
        });
        return;
      }

      if (error.code === "P2003") {
        reply.status(400).send({
          error: {
            code: "FOREIGN_KEY_VIOLATION",
            message: "Referenced record does not exist or cannot be linked",
            details: error.meta,
          },
        });
        return;
      }

      if (error.code === "P2025") {
        reply.status(404).send({
          error: {
            code: "RECORD_NOT_FOUND",
            message: "Record was not found",
            details: error.meta,
          },
        });
        return;
      }
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

function parseOriginHost(origin: string) {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

function isDevHostAllowed(host: string) {
  if (devLocalHosts.has(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  const match = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(host);
  if (!match) return false;
  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}
