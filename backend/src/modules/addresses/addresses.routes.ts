import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { badRequest } from "../../common/http-error.js";
import { env } from "../../config/env.js";

const addressSearchQuery = z.object({
  q: z.string().trim().min(3).max(160),
  limit: z.coerce.number().int().min(1).max(8).default(6),
});

const addressReverseQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  cycleway?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
};

type NominatimResult = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
};

export async function registerAddressRoutes(app: FastifyInstance) {
  app.get("/api/v1/address/search", async (request, reply) => {
    const query = addressSearchQuery.safeParse(request.query);
    if (!query.success) throw badRequest("Invalid address search query", query.error.flatten());

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query.data.q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", String(query.data.limit));

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Language": String(request.headers["accept-language"] ?? "en"),
        "User-Agent": `FKH/0.1 (${env.PUBLIC_API_URL})`,
      },
    });
    const payload = await response.json().catch(() => []) as NominatimResult[];
    if (!response.ok || !Array.isArray(payload)) {
      throw badRequest("Address search is unavailable");
    }

    reply.header("Cache-Control", "private, max-age=300");
    return {
      data: payload.map(normalizeAddressResult),
    };
  });

  app.get("/api/v1/address/reverse", async (request, reply) => {
    const query = addressReverseQuery.safeParse(request.query);
    if (!query.success) throw badRequest("Invalid address coordinates", query.error.flatten());

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(query.data.lat));
    url.searchParams.set("lon", String(query.data.lon));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Language": String(request.headers["accept-language"] ?? "en"),
        "User-Agent": `FKH/0.1 (${env.PUBLIC_API_URL})`,
      },
    });
    const payload = await response.json().catch(() => null) as NominatimResult | null;
    if (!response.ok || !payload) {
      throw badRequest("Address lookup is unavailable");
    }

    reply.header("Cache-Control", "private, max-age=300");
    return {
      data: normalizeAddressResult(payload),
    };
  });
}

function normalizeAddressResult(item: NominatimResult) {
  const address = item.address ?? {};
  const streetName = address.road ?? address.pedestrian ?? address.footway ?? address.cycleway ?? "";
  const houseNumber = address.house_number ?? "";
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? "";
  const region = address.state ?? address.county ?? "";
  const addressLine1 = [streetName, houseNumber].filter(Boolean).join(" ").trim();

  return {
    id: String(item.place_id ?? `${item.lat ?? ""}:${item.lon ?? ""}:${item.display_name ?? ""}`),
    displayName: item.display_name ?? addressLine1,
    addressLine1,
    city,
    region,
    postalCode: address.postcode ?? "",
    country: address.country ?? "",
    countryCode: address.country_code?.toUpperCase() ?? "",
    latitude: item.lat ? Number(item.lat) : null,
    longitude: item.lon ? Number(item.lon) : null,
  };
}
