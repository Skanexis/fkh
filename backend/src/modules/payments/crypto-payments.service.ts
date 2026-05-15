import crypto from "node:crypto";
import { OrderStatus } from "@prisma/client";
import { badRequest } from "../../common/http-error.js";
import { money } from "../../common/serialize.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { sendTelegramJson } from "../telegram/telegram.service.js";

export const CRYPTO_PAYMENT_METHODS = [
  {
    code: "btc",
    label: "BTC",
    network: "Bitcoin",
    providerCurrency: "btc",
    addressEnv: "CRYPTO_BTC_ADDRESSES",
    priceId: "bitcoin",
    decimals: 8,
    minMarkerUnits: 1,
    maxMarkerUnits: 999,
  },
  {
    code: "usdt_erc20",
    label: "USDT (ETH)",
    network: "Ethereum ERC-20",
    providerCurrency: "usdterc20",
    addressEnv: "CRYPTO_USDT_ERC20_ADDRESSES",
    priceId: "tether",
    decimals: 6,
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    minMarkerUnits: 1,
    maxMarkerUnits: 9999,
  },
  {
    code: "usdt_trc20",
    label: "USDT (TRON)",
    network: "TRON TRC-20",
    providerCurrency: "usdttrc20",
    addressEnv: "CRYPTO_USDT_TRC20_ADDRESSES",
    priceId: "tether",
    decimals: 6,
    contractAddress: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
    minMarkerUnits: 1,
    maxMarkerUnits: 9999,
  },
  {
    code: "usdc_erc20",
    label: "USDC (ETH)",
    network: "Ethereum ERC-20",
    providerCurrency: "usdc",
    addressEnv: "CRYPTO_USDC_ERC20_ADDRESSES",
    priceId: "usd-coin",
    decimals: 6,
    contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    minMarkerUnits: 1,
    maxMarkerUnits: 9999,
  },
] as const;

export type CryptoPaymentCode = typeof CRYPTO_PAYMENT_METHODS[number]["code"];

const activeSelfCustodyStatuses = ["waiting", "confirming", "partially_paid"];
const invoiceTransferLookbackMs = 5 * 60 * 1000;

interface CreateCryptoPaymentInput {
  orderId: string;
  publicId: string;
  amount: number;
  currency: string;
  paymentCode: CryptoPaymentCode;
}

interface ObservedTransfer {
  chain: string;
  asset: string;
  txHash: string;
  outputIndex: number;
  amount: number;
  confirmations: number;
  confirmedAt?: Date;
  rawPayload: unknown;
}

export function getCryptoPaymentMethod(code: string) {
  return CRYPTO_PAYMENT_METHODS.find((method) => method.code === code);
}

export async function getCryptoPaymentMethodsAvailability() {
  return Promise.all(
    CRYPTO_PAYMENT_METHODS.map(async (method) => {
      const addresses = getSelfCustodyAddresses(method.addressEnv);
      const busyPayments = addresses.length > 0
        ? await prisma.cryptoPayment.findMany({
            where: {
              provider: "self_custody",
              currencyCode: method.code,
              payAddress: { in: addresses },
              providerStatus: { in: activeSelfCustodyStatuses },
              order: { status: OrderStatus.pending },
            },
            select: { payAddress: true },
          })
        : [];
      const busyAddresses = new Set(busyPayments.map((payment) => payment.payAddress).filter(Boolean));
      const wallets = addresses.map((_address, index) => ({
        label: `Wallet ${index + 1}`,
        status: busyAddresses.has(_address) ? "busy" : "available",
      }));
      const busySlots = wallets.filter((wallet) => wallet.status === "busy").length;
      const freeSlots = wallets.length - busySlots;

      return {
        code: method.code,
        label: method.label,
        network: method.network,
        available: freeSlots > 0,
        configured: addresses.length > 0,
        totalSlots: addresses.length,
        freeSlots,
        busySlots,
        wallets,
      };
    }),
  );
}

export async function createCryptoPayment(input: CreateCryptoPaymentInput) {
  const method = getCryptoPaymentMethod(input.paymentCode);
  if (!method) throw badRequest("Unsupported crypto payment currency");

  const payAddress = await pickSelfCustodyAddress(method.code);
  const payAmount = await quoteCryptoAmount({
    eurAmount: input.amount,
    priceId: method.priceId,
    decimals: method.decimals,
    publicId: input.publicId,
    minMarkerUnits: method.minMarkerUnits,
    maxMarkerUnits: method.maxMarkerUnits,
  });
  const expiresAt = new Date(Date.now() + paymentTtlMinutes(method.code) * 60_000);

  return prisma.cryptoPayment.update({
    where: { orderId: input.orderId },
    data: {
      provider: "self_custody",
      providerPaymentId: `self:${input.publicId}`,
      providerStatus: "waiting",
      payAmount: payAmount.toFixed(method.decimals),
      payAddress,
      expiresAt,
      rawProviderPayload: {
        publicId: input.publicId,
        priceSource: "coingecko",
        paymentAddressPool: method.addressEnv,
        uniqueAmountMarker: true,
      },
    },
  });
}

async function pickSelfCustodyAddress(code: CryptoPaymentCode) {
  const method = getCryptoPaymentMethod(code);
  if (!method) throw badRequest("Unsupported crypto payment currency");

  const addresses = getSelfCustodyAddresses(method.addressEnv);
  if (addresses.length === 0) {
    throw badRequest(`${method.label} payment addresses are not configured`);
  }

  const busyPayments = await prisma.cryptoPayment.findMany({
    where: {
      provider: "self_custody",
      currencyCode: method.code,
      payAddress: { in: addresses },
      providerStatus: { in: activeSelfCustodyStatuses },
      order: { status: OrderStatus.pending },
    },
    select: { payAddress: true },
  });
  const busyAddresses = new Set(busyPayments.map((payment) => payment.payAddress).filter(Boolean));
  const freeAddress = addresses.find((address) => !busyAddresses.has(address));

  if (!freeAddress) {
    throw badRequest(`${method.label} address pool is busy. Wait for active invoices to finish or add more receiving addresses.`);
  }

  return freeAddress;
}

function getSelfCustodyAddresses(envKey: string) {
  const value = (env as any)[envKey] as string | undefined;
  return (value ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

async function quoteCryptoAmount(input: {
  eurAmount: number;
  priceId: string;
  decimals: number;
  publicId: string;
  minMarkerUnits: number;
  maxMarkerUnits: number;
}) {
  const response = await fetch(`${env.COINGECKO_API_URL.replace(/\/+$/, "")}/simple/price?ids=${encodeURIComponent(input.priceId)}&vs_currencies=eur`);
  const payload = await response.json().catch(() => null) as Record<string, { eur?: number }> | null;
  const eurPrice = payload?.[input.priceId]?.eur;
  if (!response.ok || !eurPrice || eurPrice <= 0) {
    throw badRequest("Could not quote crypto payment amount");
  }

  const scale = 10 ** input.decimals;
  const baseUnits = Math.ceil((input.eurAmount / eurPrice) * scale);
  const markerUnits = uniqueMarkerUnits(input.publicId, input.minMarkerUnits, input.maxMarkerUnits);
  return (baseUnits + markerUnits) / scale;
}

function uniqueMarkerUnits(publicId: string, minUnits: number, maxUnits: number) {
  const digest = crypto.createHash("sha256").update(publicId).digest();
  const value = digest.readUInt32BE(0);
  return minUnits + (value % Math.max(1, maxUnits - minUnits + 1));
}

function paymentTtlMinutes(code: CryptoPaymentCode) {
  if (code === "btc") return env.CRYPTO_BTC_PAYMENT_TTL_MINUTES ?? env.CRYPTO_PAYMENT_TTL_MINUTES;
  if (code === "usdt_trc20") return env.CRYPTO_TRON_PAYMENT_TTL_MINUTES ?? env.CRYPTO_PAYMENT_TTL_MINUTES;
  return env.CRYPTO_ETH_TOKEN_PAYMENT_TTL_MINUTES ?? env.CRYPTO_PAYMENT_TTL_MINUTES;
}

export function startCryptoPaymentWatcher(app: { log?: { error: (input: unknown) => void; info: (input: unknown) => void } }) {
  const run = () => {
    pollSelfCustodyPayments().catch((error) => app.log?.error(error));
  };

  run();
  const timer = setInterval(run, env.CRYPTO_POLL_INTERVAL_SECONDS * 1000);
  (timer as any).unref?.();
}

async function pollSelfCustodyPayments() {
  await expireStaleCryptoPayments();

  const payments = await prisma.cryptoPayment.findMany({
    where: {
      provider: "self_custody",
      providerStatus: { in: activeSelfCustodyStatuses },
      payAddress: { not: null },
      payAmount: { not: null },
      order: { status: OrderStatus.pending },
    },
    include: { order: { include: { items: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  for (const payment of payments) {
    await refreshSelfCustodyPayment(payment).catch(() => undefined);
  }
}

async function expireStaleCryptoPayments() {
  const now = new Date();
  await prisma.cryptoPayment.updateMany({
    where: {
      provider: "self_custody",
      providerStatus: { in: ["waiting", "confirming"] },
      expiresAt: { lt: now },
      order: { status: OrderStatus.pending },
    },
    data: {
      providerStatus: "expired",
      rawProviderPayload: {
        expiredAt: now.toISOString(),
        reason: "invoice_ttl_elapsed",
      },
    },
  });
}

async function refreshSelfCustodyPayment(payment: any) {
  const method = getCryptoPaymentMethod(payment.currencyCode);
  if (!method || !payment.payAddress || !payment.payAmount) return;

  const transfers = await getConfirmedTransfers(method, payment.payAddress, payment.createdAt);
  if (transfers.length > 0) {
    for (const transfer of transfers) {
      await prisma.cryptoPaymentTransaction.upsert({
        where: {
          chain_asset_txHash_outputIndex: {
            chain: transfer.chain,
            asset: transfer.asset,
            txHash: transfer.txHash,
            outputIndex: transfer.outputIndex,
          },
        },
        update: {
          confirmations: transfer.confirmations,
          confirmedAt: transfer.confirmedAt,
          rawPayload: toJson(transfer.rawPayload),
        },
        create: {
          cryptoPaymentId: payment.id,
          chain: transfer.chain,
          asset: transfer.asset,
          txHash: transfer.txHash,
          outputIndex: transfer.outputIndex,
          amount: transfer.amount.toFixed(method.decimals),
          confirmations: transfer.confirmations,
          confirmedAt: transfer.confirmedAt,
          rawPayload: toJson(transfer.rawPayload),
        },
      });
    }
  }

  const recordedTransfers = await prisma.cryptoPaymentTransaction.findMany({
    where: { cryptoPaymentId: payment.id },
    select: { amount: true, confirmations: true, confirmedAt: true },
  });
  const observedReceived = recordedTransfers.reduce((sum, transfer) => sum + Number(transfer.amount), 0);
  const confirmedReceived = recordedTransfers
    .filter((transfer) => transferIsConfirmed(method.code, transfer))
    .reduce((sum, transfer) => sum + Number(transfer.amount), 0);
  const expected = Number(payment.payAmount);
  const previousStatus = payment.providerStatus;
  const nextStatus = confirmedReceived >= expected
    ? "finished"
    : confirmedReceived > 0
      ? "partially_paid"
      : observedReceived > 0
        ? "confirming"
        : "waiting";
  const now = new Date();
  const shouldConfirmOrder = nextStatus === "finished" && payment.order.status === OrderStatus.pending;
  const shouldNotifyPayment = nextStatus === "finished" && !payment.paidAt;
  const shouldNotifyUnderpayment = nextStatus === "partially_paid" && previousStatus !== "partially_paid";

  const updated = await prisma.$transaction(async (tx) => {
    await tx.cryptoPayment.update({
      where: { id: payment.id },
      data: {
        providerStatus: nextStatus,
        actuallyPaid: confirmedReceived.toFixed(method.decimals),
        paidAt: nextStatus === "finished" ? (payment.paidAt ?? now) : payment.paidAt,
        rawProviderPayload: {
          ...(typeof payment.rawProviderPayload === "object" && payment.rawProviderPayload ? payment.rawProviderPayload : {}),
          lastPollAt: now.toISOString(),
          lastObservedReceived: observedReceived.toFixed(method.decimals),
          lastConfirmedReceived: confirmedReceived.toFixed(method.decimals),
          lastPendingReceived: Math.max(0, observedReceived - confirmedReceived).toFixed(method.decimals),
        },
      },
    });

    if (!shouldConfirmOrder) {
      return tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        include: { items: true, cryptoPayment: true },
      });
    }

    return tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.accepted,
        acceptedAt: payment.order.acceptedAt ?? now,
      },
      include: { items: true, cryptoPayment: true },
    });
  });

  if (shouldNotifyPayment) {
    await notifyCryptoPaymentConfirmed(updated);
  }

  if (shouldNotifyUnderpayment) {
    await notifyCryptoPaymentUnderpaid(updated);
  }
}

function transferIsConfirmed(code: CryptoPaymentCode, transfer: { confirmations: number; confirmedAt: Date | null }) {
  if (code === "btc") {
    return transfer.confirmations >= env.CRYPTO_BTC_CONFIRMATIONS;
  }
  if (code === "usdt_trc20") {
    return transfer.confirmations >= env.CRYPTO_TRON_CONFIRMATIONS;
  }
  return transfer.confirmations >= env.CRYPTO_ETH_CONFIRMATIONS;
}

async function getConfirmedTransfers(
  method: NonNullable<ReturnType<typeof getCryptoPaymentMethod>>,
  address: string,
  invoiceCreatedAt: Date,
) {
  if (method.code === "btc") return getBtcTransfers(address, invoiceCreatedAt);
  if (method.code === "usdt_trc20") return getTronTrc20Transfers(address, method.contractAddress!, invoiceCreatedAt);
  return getEthereumTokenTransfers(address, method.contractAddress!, method.decimals, method.code, invoiceCreatedAt);
}

async function getBtcTransfers(address: string, invoiceCreatedAt: Date): Promise<ObservedTransfer[]> {
  const response = await fetch(`${env.MEMPOOL_API_URL.replace(/\/+$/, "")}/address/${encodeURIComponent(address)}/txs`);
  const transactions = await response.json().catch(() => []) as Array<any>;
  if (!response.ok || !Array.isArray(transactions)) return [];

  const minTime = invoiceCreatedAt.getTime() - invoiceTransferLookbackMs;
  const transfers: ObservedTransfer[] = [];
  for (const tx of transactions) {
    const isConfirmed = Boolean(tx.status?.confirmed);
    const confirmedAt = tx.status?.block_time ? new Date(Number(tx.status.block_time) * 1000) : undefined;
    if (confirmedAt && confirmedAt.getTime() < minTime) continue;

    const outputs = Array.isArray(tx.vout) ? tx.vout : [];
    outputs.forEach((output: any, index: number) => {
      if (output.scriptpubkey_address !== address) return;
      const amount = Number(output.value ?? 0) / 100_000_000;
      if (amount <= 0) return;
      transfers.push({
        chain: "bitcoin",
        asset: "btc",
        txHash: String(tx.txid),
        outputIndex: index,
        amount,
        confirmations: isConfirmed ? env.CRYPTO_BTC_CONFIRMATIONS : 0,
        confirmedAt: isConfirmed ? confirmedAt : undefined,
        rawPayload: tx,
      });
    });
  }

  return transfers;
}

async function getEthereumTokenTransfers(
  address: string,
  contractAddress: string,
  decimals: number,
  asset: string,
  invoiceCreatedAt: Date,
): Promise<ObservedTransfer[]> {
  if (!env.ETHERSCAN_API_KEY) return [];
  const url = new URL(env.ETHERSCAN_API_URL);
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", contractAddress);
  url.searchParams.set("address", address);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", env.ETHERSCAN_API_KEY);

  const response = await fetch(url);
  const payload = await response.json().catch(() => null) as { result?: any[] } | null;
  const transfers = Array.isArray(payload?.result) ? payload.result : [];
  const minTime = invoiceCreatedAt.getTime() - invoiceTransferLookbackMs;

  return transfers
    .filter((transfer) => String(transfer.to ?? "").toLowerCase() === address.toLowerCase())
    .filter((transfer) => Number(transfer.confirmations ?? 0) >= env.CRYPTO_ETH_CONFIRMATIONS)
    .filter((transfer) => Number(transfer.timeStamp ?? 0) * 1000 >= minTime)
    .map((transfer, index) => ({
      chain: "ethereum",
      asset,
      txHash: String(transfer.hash),
      outputIndex: Number(transfer.logIndex ?? index),
      amount: Number(transfer.value ?? 0) / 10 ** decimals,
      confirmations: Number(transfer.confirmations ?? 0),
      confirmedAt: transfer.timeStamp ? new Date(Number(transfer.timeStamp) * 1000) : undefined,
      rawPayload: transfer,
    }))
    .filter((transfer) => transfer.amount > 0);
}

async function getTronTrc20Transfers(
  address: string,
  contractAddress: string,
  invoiceCreatedAt: Date,
): Promise<ObservedTransfer[]> {
  const url = new URL(`${env.TRONGRID_API_URL.replace(/\/+$/, "")}/v1/accounts/${encodeURIComponent(address)}/transactions/trc20`);
  url.searchParams.set("only_confirmed", "true");
  url.searchParams.set("contract_address", contractAddress);
  url.searchParams.set("limit", "200");

  const headers: Record<string, string> = {};
  if (env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = env.TRONGRID_API_KEY;

  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => null) as { data?: any[] } | null;
  const transfers = Array.isArray(payload?.data) ? payload.data : [];
  const minTime = invoiceCreatedAt.getTime() - invoiceTransferLookbackMs;

  return transfers
    .filter((transfer) => String(transfer.to ?? "") === address)
    .filter((transfer) => Number(transfer.block_timestamp ?? 0) >= minTime)
    .map((transfer, index) => {
      const decimals = Number(transfer.token_info?.decimals ?? 6);
      return {
        chain: "tron",
        asset: "usdt_trc20",
        txHash: String(transfer.transaction_id),
        outputIndex: Number(transfer.log_index ?? index),
        amount: Number(transfer.value ?? 0) / 10 ** decimals,
        confirmations: env.CRYPTO_TRON_CONFIRMATIONS,
        confirmedAt: transfer.block_timestamp ? new Date(Number(transfer.block_timestamp)) : undefined,
        rawPayload: transfer,
      };
    })
    .filter((transfer) => transfer.amount > 0);
}

export function serializeCryptoPayment(payment: any) {
  if (!payment) return null;
  const remainingAmount = remainingCryptoAmount(payment);
  const pendingAmount = pendingCryptoAmount(payment);
  return {
    id: payment.id,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    providerStatus: payment.providerStatus,
    currencyCode: payment.currencyCode,
    currencyLabel: payment.currencyLabel,
    providerCurrency: payment.providerCurrency,
    network: payment.network,
    priceAmount: money(payment.priceAmount),
    priceCurrency: payment.priceCurrency,
    payAmount: payment.payAmount === null || payment.payAmount === undefined ? null : Number(payment.payAmount),
    payAddress: payment.payAddress,
    payinExtraId: payment.payinExtraId,
    actuallyPaid: payment.actuallyPaid === null || payment.actuallyPaid === undefined ? null : Number(payment.actuallyPaid),
    pendingAmount,
    remainingAmount,
    isUnderpaid: remainingAmount !== null && remainingAmount > 0 && payment.providerStatus === "partially_paid",
    paidAt: payment.paidAt?.toISOString() ?? null,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export function cryptoPaymentHasIncomingFunds(payment: any) {
  const actuallyPaid = Number(payment.actuallyPaid ?? 0);
  const pendingAmount = pendingCryptoAmount(payment);
  return (
    Number.isFinite(actuallyPaid) && actuallyPaid > 0
  ) || (
    Number.isFinite(pendingAmount) && pendingAmount > 0
  ) || ["confirming", "partially_paid", "finished"].includes(payment.providerStatus);
}

function pendingCryptoAmount(payment: any) {
  const raw = typeof payment.rawProviderPayload === "object" && payment.rawProviderPayload ? payment.rawProviderPayload : null;
  const value = raw && "lastPendingReceived" in raw ? Number((raw as any).lastPendingReceived) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function remainingCryptoAmount(payment: any) {
  if (payment.payAmount === null || payment.payAmount === undefined) return null;
  const expected = Number(payment.payAmount);
  const paid = payment.actuallyPaid === null || payment.actuallyPaid === undefined ? 0 : Number(payment.actuallyPaid);
  const remaining = expected - paid;
  return remaining > 0 ? Number(remaining.toFixed(12)) : 0;
}

function toJson(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

async function notifyCryptoPaymentConfirmed(order: any) {
  if (!env.ORDER_NOTIFICATIONS_ENABLED || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  const payment = order.cryptoPayment;
  await sendTelegramJson("sendMessage", {
    chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
    parse_mode: "HTML",
    text: [
      `✅ <b>Payment confirmed for ${escapeHtml(order.publicId)}</b>`,
      "",
      `<b>Status:</b> Confirmed`,
      `<b>Total:</b> ${money(order.totalAmount)} ${order.currency}`,
      payment ? `<b>Crypto:</b> ${escapeHtml(payment.currencyLabel)} (${escapeHtml(payment.network)})` : null,
      payment?.actuallyPaid ? `<b>Paid:</b> ${escapeHtml(payment.actuallyPaid)} ${escapeHtml(payment.providerCurrency.toUpperCase())}` : null,
      payment?.providerPaymentId ? `<b>Payment ID:</b> <code>${escapeHtml(payment.providerPaymentId)}</code>` : null,
    ].filter(Boolean).join("\n"),
  });
}

async function notifyCryptoPaymentUnderpaid(order: any) {
  if (!env.ORDER_NOTIFICATIONS_ENABLED || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  const payment = order.cryptoPayment;
  const remainingAmount = remainingCryptoAmount(payment);
  await sendTelegramJson("sendMessage", {
    chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
    parse_mode: "HTML",
    text: [
      `⚠️ <b>Payment underpaid for ${escapeHtml(order.publicId)}</b>`,
      "",
      `<b>Status:</b> Partially paid`,
      `<b>Total:</b> ${money(order.totalAmount)} ${order.currency}`,
      payment ? `<b>Crypto:</b> ${escapeHtml(payment.currencyLabel)} (${escapeHtml(payment.network)})` : null,
      payment?.actuallyPaid ? `<b>Received:</b> ${escapeHtml(payment.actuallyPaid)} ${escapeHtml(payment.providerCurrency.toUpperCase())}` : null,
      remainingAmount ? `<b>Remaining:</b> ${escapeHtml(remainingAmount)} ${escapeHtml(payment.providerCurrency.toUpperCase())}` : null,
      payment?.providerPaymentId ? `<b>Payment ID:</b> <code>${escapeHtml(payment.providerPaymentId)}</code>` : null,
    ].filter(Boolean).join("\n"),
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
