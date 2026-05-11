import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { User, UserSession } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { badRequest, notFound, unauthorized } from "../../common/http-error.js";

export function createNonce() {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return crypto
    .createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(token)
    .digest("hex");
}

export function createDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  telegramId: string;
}) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (input.username) return `@${input.username}`;
  return `Telegram User ${input.telegramId}`;
}

export async function startTelegramLogin(ip?: string, userAgent?: string) {
  const nonce = createNonce();
  const expiresAt = new Date(Date.now() + env.TELEGRAM_LOGIN_REQUEST_TTL_SECONDS * 1000);

  const authRequest = await prisma.telegramAuthRequest.create({
    data: {
      nonce,
      expiresAt,
      ip,
      userAgent,
    },
  });

  if (!env.TELEGRAM_BOT_USERNAME) {
    throw badRequest("TELEGRAM_BOT_USERNAME is not configured");
  }

  return {
    authRequestId: authRequest.id,
    botStartUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${nonce}`,
    expiresAt: authRequest.expiresAt.toISOString(),
  };
}

export async function createTokenPair(
  app: FastifyInstance,
  user: Pick<User, "id" | "role">,
  sessionMeta?: { ip?: string; userAgent?: string },
) {
  const accessToken = app.jwt.sign(
    { sub: user.id, role: user.role },
    {
      expiresIn: env.ACCESS_TOKEN_TTL,
    },
  );

  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      ip: sessionMeta?.ip,
      userAgent: sessionMeta?.userAgent,
    },
  });

  return { accessToken, refreshToken };
}

export async function getTelegramLoginStatus(
  app: FastifyInstance,
  authRequestId: string,
  sessionMeta?: { ip?: string; userAgent?: string },
) {
  const authRequest = await prisma.telegramAuthRequest.findUnique({
    where: { id: authRequestId },
    include: { user: true },
  });

  if (!authRequest) throw notFound("Telegram login request not found");

  if (authRequest.status === "pending" && authRequest.expiresAt.getTime() < Date.now()) {
    await prisma.telegramAuthRequest.update({
      where: { id: authRequest.id },
      data: { status: "expired" },
    });
    return { status: "expired" };
  }

  if (authRequest.status !== "confirmed") {
    return { status: authRequest.status };
  }

  if (!authRequest.user) {
    throw badRequest("Confirmed login request has no user");
  }

  if (authRequest.consumedAt) {
    return { status: "consumed" };
  }

  const tokens = await createTokenPair(app, authRequest.user, sessionMeta);

  await prisma.telegramAuthRequest.update({
    where: { id: authRequest.id },
    data: { consumedAt: new Date() },
  });

  return {
    status: "confirmed",
    user: serializeAuthUser(authRequest.user),
    ...tokens,
  };
}

export async function refreshToken(app: FastifyInstance, token: string, meta?: { ip?: string; userAgent?: string }) {
  const tokenHash = hashRefreshToken(token);
  const session = await prisma.userSession.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: { user: true },
  });

  if (!isActiveSession(session)) throw unauthorized("Invalid refresh token");
  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return createTokenPair(app, session.user, meta);
}

export async function revokeRefreshToken(token: string) {
  const tokenHash = hashRefreshToken(token);
  await prisma.userSession.updateMany({
    where: { refreshTokenHash: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function isActiveSession(session: (UserSession & { user: User }) | null): session is UserSession & { user: User } {
  return Boolean(session && !session.revokedAt && session.expiresAt.getTime() > Date.now());
}

export function serializeAuthUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    telegramId: user.telegramId,
    telegramUsername: user.telegramUsername,
    telegramPhotoUrl: user.telegramPhotoUrl,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
  };
}
