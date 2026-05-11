import { Decimal } from "@prisma/client/runtime/library";

export function money(value: Decimal | number | string) {
  if (value instanceof Decimal) return Number(value.toFixed(2));
  return Number(value);
}

export function pageMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
