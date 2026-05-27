export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function notFound(message = "Resource not found") {
  return new HttpError(404, "NOT_FOUND", message);
}

export function badRequest(message = "Bad request", details?: unknown) {
  return new HttpError(400, "BAD_REQUEST", message, details);
}

export function internalServerError(message = "Internal server error", code = "INTERNAL_SERVER_ERROR") {
  return new HttpError(500, code, message);
}

export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, "FORBIDDEN", message);
}
