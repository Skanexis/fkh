import { TelegramAuthStatus, UserRole } from "@prisma/client";
import { env, telegramAdminIds } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { createDisplayName } from "../auth/auth.service.js";

interface TelegramUserPayload {
  id: number | string;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export async function confirmTelegramLogin(nonce: string, telegramUser: TelegramUserPayload) {
  const telegramId = String(telegramUser.id);
  const authRequest = await prisma.telegramAuthRequest.findUnique({ where: { nonce } });

  if (!authRequest || authRequest.status !== TelegramAuthStatus.pending) {
    return { ok: false, message: "Login request is not active." };
  }

  if (authRequest.expiresAt.getTime() < Date.now()) {
    await prisma.telegramAuthRequest.update({
      where: { id: authRequest.id },
      data: { status: TelegramAuthStatus.expired },
    });
    return { ok: false, message: "Login request expired. Start login again from the site." };
  }

  const telegramPhotoUrl = await getTelegramPhotoUrl(telegramId);
  const role = telegramAdminIds.has(telegramId) ? UserRole.admin : UserRole.user;

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {
      telegramUsername: telegramUser.username ?? null,
      telegramFirstName: telegramUser.first_name ?? null,
      telegramLastName: telegramUser.last_name ?? null,
      telegramLanguageCode: telegramUser.language_code ?? null,
      telegramPhotoUrl,
      avatarUrl: telegramPhotoUrl,
      name: createDisplayName({
        telegramId,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      }),
      role,
      lastLoginAt: new Date(),
    },
    create: {
      telegramId,
      telegramUsername: telegramUser.username ?? null,
      telegramFirstName: telegramUser.first_name ?? null,
      telegramLastName: telegramUser.last_name ?? null,
      telegramLanguageCode: telegramUser.language_code ?? null,
      telegramPhotoUrl,
      avatarUrl: telegramPhotoUrl,
      name: createDisplayName({
        telegramId,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      }),
      role,
      lastLoginAt: new Date(),
    },
  });

  await prisma.telegramAuthRequest.update({
    where: { id: authRequest.id },
    data: {
      status: TelegramAuthStatus.confirmed,
      telegramId,
      userId: user.id,
      confirmedAt: new Date(),
    },
  });

  return { ok: true, message: "Accesso confermato. Puoi tornare al sito." };
}

export async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!env.TELEGRAM_BOT_TOKEN) return;

  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => undefined);
}

async function getTelegramPhotoUrl(telegramId: string) {
  if (!env.TELEGRAM_BOT_TOKEN) return null;

  try {
    const photosResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`,
    );
    const photos = (await photosResponse.json()) as {
      ok?: boolean;
      result?: { photos?: Array<Array<{ file_id: string }>> };
    };
    const fileId = photos.result?.photos?.[0]?.at(-1)?.file_id;
    if (!fileId) return null;

    const fileResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
    );
    const file = (await fileResponse.json()) as { ok?: boolean; result?: { file_path?: string } };
    if (!file.result?.file_path) return null;

    return `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.result.file_path}`;
  } catch {
    return null;
  }
}
