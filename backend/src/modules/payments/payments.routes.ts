import type { FastifyInstance } from "fastify";
import { getCryptoPaymentMethodsAvailability } from "./crypto-payments.service.js";

export async function registerPaymentRoutes(app: FastifyInstance) {
  app.get("/api/v1/payments/crypto/methods", async (_request, reply) => {
    reply
      .header("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate")
      .header("Pragma", "no-cache")
      .header("Expires", "0");

    return {
      data: await getCryptoPaymentMethodsAvailability(),
    };
  });
}
