import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { MediaType } from "@prisma/client";
import { requireAdmin } from "../../common/auth.js";
import { badRequest } from "../../common/http-error.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";

const allowedImageMimes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoMimes = new Set(["video/mp4", "video/webm"]);
const maxImageBytes = 10 * 1024 * 1024;
const maxVideoBytes = 100 * 1024 * 1024;

export async function registerMediaRoutes(app: FastifyInstance) {
  app.get("/api/v1/admin/media", async (request) => {
    await requireAdmin(request);
    const media = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return { data: media.map(serializeMediaAsset) };
  });

  app.post("/api/v1/admin/media", async (request) => {
    await requireAdmin(request);
    const file = await request.file();
    if (!file) throw badRequest("File is required");

    const mediaType = allowedImageMimes.has(file.mimetype)
      ? MediaType.image
      : allowedVideoMimes.has(file.mimetype)
        ? MediaType.video
        : null;

    if (!mediaType) throw badRequest("Unsupported file type");

    const buffer = await file.toBuffer();
    const maxBytes = mediaType === MediaType.image ? maxImageBytes : maxVideoBytes;
    if (buffer.byteLength > maxBytes) throw badRequest("File is too large");

    const ext = extensionFromMime(file.mimetype);
    const id = crypto.randomUUID();
    const safeName = `${id}${ext}`;
    const uploadDir = path.resolve(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);

    const publicBase = env.PUBLIC_API_URL.replace(/\/$/, "");
    const url = `${publicBase}/uploads/${safeName}`;
    const asset = await prisma.mediaAsset.create({
      data: {
        id,
        type: mediaType,
        url,
        thumbnailUrl: mediaType === MediaType.image ? url : null,
        mimeType: file.mimetype,
        sizeBytes: buffer.byteLength,
      },
    });

    return { data: serializeMediaAsset(asset) };
  });
}

function extensionFromMime(mime: string) {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    default:
      return ".jpg";
  }
}

function serializeMediaAsset(asset: any) {
  return {
    id: asset.id,
    type: asset.type,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.durationSeconds,
    createdAt: asset.createdAt.toISOString(),
  };
}
