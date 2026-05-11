import type { FastifyRequest } from "fastify";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { forbidden, unauthorized } from "./http-error.js";

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      id: string;
      role: UserRole;
      status: UserStatus;
      telegramId: string;
    };
  }
}

export async function requireUser(request: FastifyRequest) {
  try {
    await request.jwtVerify<AuthTokenPayload>();
  } catch {
    throw unauthorized();
  }

  const payload = request.user as AuthTokenPayload;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, status: true, telegramId: true },
  });

  if (!user) throw unauthorized();

  request.authUser = user;
  return user;
}

export async function requireActiveUser(request: FastifyRequest) {
  const user = await requireUser(request);
  if (user.status !== UserStatus.active) throw forbidden("User is not active");
  return user;
}

export async function requireAdmin(request: FastifyRequest) {
  const user = await requireUser(request);
  if (user.status !== UserStatus.active) throw forbidden("User is not active");
  if (user.role !== UserRole.admin) throw forbidden("Admin role required");
  return user;
}
