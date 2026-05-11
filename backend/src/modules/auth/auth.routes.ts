import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { badRequest } from "../../common/http-error.js";
import { getTelegramLoginStatus, refreshToken, revokeRefreshToken, startTelegramLogin } from "./auth.service.js";

const authRequestIdParams = z.object({
  authRequestId: z.string().uuid(),
});

const refreshBody = z.object({
  refreshToken: z.string().min(20),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/v1/auth/telegram/start", async (request) => {
    const data = await startTelegramLogin(request.ip, request.headers["user-agent"]);
    return { data };
  });

  app.get("/api/v1/auth/telegram/status/:authRequestId", async (request) => {
    const params = authRequestIdParams.safeParse(request.params);
    if (!params.success) throw badRequest("Invalid auth request id", params.error.flatten());

    const data = await getTelegramLoginStatus(app, params.data.authRequestId, {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
    return { data };
  });

  app.post("/api/v1/auth/refresh", async (request) => {
    const body = refreshBody.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid refresh payload", body.error.flatten());

    const data = await refreshToken(app, body.data.refreshToken, {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
    return { data };
  });

  app.post("/api/v1/auth/logout", async (request) => {
    const body = refreshBody.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid logout payload", body.error.flatten());

    await revokeRefreshToken(body.data.refreshToken);
    return { data: { success: true } };
  });
}
