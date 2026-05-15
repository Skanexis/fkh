import type { FastifyInstance } from "fastify";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { requireActiveUser, requireUser } from "../../common/auth.js";
import { badRequest, notFound } from "../../common/http-error.js";
import { prisma } from "../../db/prisma.js";
import { serializeAuthUser } from "../auth/auth.service.js";
import { serializeOrder } from "../orders/orders.routes.js";

const updateMeBody = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(5).max(40).nullable().optional(),
});

export async function registerUserRoutes(app: FastifyInstance) {
  app.get("/api/v1/me", async (request) => {
    const authUser = await requireUser(request);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });
    return { data: serializeAuthUser(user) };
  });

  app.patch("/api/v1/me", async (request) => {
    const authUser = await requireActiveUser(request);
    const body = updateMeBody.safeParse(request.body);
    if (!body.success) throw badRequest("Invalid profile payload", body.error.flatten());

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: body.data,
    });

    return { data: serializeAuthUser(user) };
  });

  app.get("/api/v1/me/orders", async (request) => {
    const authUser = await requireActiveUser(request);
    const orders = await prisma.order.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
      include: { items: true, cryptoPayment: true },
    });
    return { data: orders.map(serializeOrder) };
  });

  app.get("/api/v1/me/orders/:publicId", async (request) => {
    const authUser = await requireActiveUser(request);
    const params = z.object({ publicId: z.string().min(3) }).safeParse(request.params);
    if (!params.success) throw badRequest("Invalid order id", params.error.flatten());

    const order = await prisma.order.findFirst({
      where: { publicId: params.data.publicId, userId: authUser.id },
      include: { items: true, cryptoPayment: true },
    });

    if (!order) throw notFound("Order not found");
    return { data: serializeOrder(order) };
  });

  app.post("/api/v1/me/orders/:publicId/cancel-payment", async (request) => {
    const authUser = await requireActiveUser(request);
    const params = z.object({ publicId: z.string().min(3) }).safeParse(request.params);
    if (!params.success) throw badRequest("Invalid order id", params.error.flatten());

    const order = await prisma.order.findFirst({
      where: { publicId: params.data.publicId, userId: authUser.id },
      include: { cryptoPayment: true },
    });
    if (!order) throw notFound("Order not found");
    if (order.status !== OrderStatus.pending) {
      throw badRequest("Only pending orders can be cancelled by the customer");
    }
    if (!order.cryptoPayment) {
      throw badRequest("Order has no active payment");
    }
    if (cryptoPaymentHasIncomingFunds(order.cryptoPayment)) {
      throw badRequest("Payment already has incoming funds. Contact support to resolve it.");
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.cancelled,
          cancelledAt: now,
        },
      });
      await tx.cryptoPayment.deleteMany({ where: { orderId: order.id } });
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true, cryptoPayment: true },
      });
    });

    return { data: serializeOrder(updated) };
  });
}

function cryptoPaymentHasIncomingFunds(payment: any) {
  const actuallyPaid = Number(payment.actuallyPaid ?? 0);
  const raw = typeof payment.rawProviderPayload === "object" && payment.rawProviderPayload ? payment.rawProviderPayload : null;
  const pendingAmount = raw && "lastPendingReceived" in raw ? Number(raw.lastPendingReceived) : 0;
  return (
    Number.isFinite(actuallyPaid) && actuallyPaid > 0
  ) || (
    Number.isFinite(pendingAmount) && pendingAmount > 0
  ) || ["confirming", "partially_paid", "finished"].includes(payment.providerStatus);
}
