/**
 * Typed error helper used across the API so every failure carries an explicit
 * HTTP status and a stable machine-readable code. The centralized error
 * handler is the only place that turns these into responses.
 */
export class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const badRequest = (message, code = "BAD_REQUEST", details) =>
  new AppError(message, 400, code, details);

export const unauthorized = (message, code = "UNAUTHORIZED") =>
  new AppError(message, 401, code);

export const forbidden = (message, code = "FORBIDDEN") =>
  new AppError(message, 403, code);

export const notFound = (message, code = "NOT_FOUND") =>
  new AppError(message, 404, code);

export const conflict = (message, code = "CONFLICT") =>
  new AppError(message, 409, code);

export const unprocessable = (message, code = "UNPROCESSABLE", details) =>
  new AppError(message, 422, code, details);

export const tooManyRequests = (message, code = "RATE_LIMITED") =>
  new AppError(message, 429, code);

export const serviceUnavailable = (message, code = "SERVICE_UNAVAILABLE") =>
  new AppError(message, 503, code);

/** Maps PostgreSQL driver errors onto meaningful HTTP semantics. */
export const fromDatabaseError = (error) => {
  if (!error || typeof error !== "object") return error;
  if (error.code === "23503") {
    return conflict(
      "This record is referenced by other data and cannot be changed.",
      "FOREIGN_KEY_VIOLATION",
    );
  }
  if (error.code === "23505") {
    return conflict(
      "A record with these details already exists.",
      "UNIQUE_VIOLATION",
    );
  }
  if (error.code === "23502") {
    return badRequest("A required field is missing.", "NOT_NULL_VIOLATION");
  }
  if (error.code === "22P02") {
    return badRequest(
      "One of the supplied values has an invalid format.",
      "INVALID_TEXT_REPRESENTATION",
    );
  }
  if (error.code === "DB_UNAVAILABLE") {
    return serviceUnavailable(
      "The service is temporarily unavailable. Please try again shortly.",
      "DB_UNAVAILABLE",
    );
  }
  return error;
};
