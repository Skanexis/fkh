import type { FastifyInstance } from "fastify";
import { getCryptoPaymentMethodsAvailability } from "./crypto-payments.service.js";

export async function registerPaymentRoutes(app: FastifyInstance) {
  app.get("/api/v1/payments/crypto/methods", async () => {
    return {
      data: await getCryptoPaymentMethodsAvailability(),
    };
  });
}
