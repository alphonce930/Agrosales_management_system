import { fromDatabaseError } from "../utils/httpErrors.js";

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Resolves the HTTP status for an error without ever turning a real failure
 * into a success. Deliberately explicit so behaviour is auditable.
 */
const resolveStatus = (error) => {
  if (Number.isInteger(error?.status) && error.status >= 400) {
    return error.status;
  }
  if (Number.isInteger(error?.statusCode) && error.statusCode >= 400) {
    return error.statusCode;
  }
  // Body parser failures raised by express.json()
  if (error?.type === "entity.parse.failed") return 400;
  if (error?.type === "entity.too.large") return 413;
  if (error?.code === "DB_UNAVAILABLE") return 503;
  if (error?.name === "JsonWebTokenError") return 401;
  if (error?.name === "TokenExpiredError") return 401;
  return 500;
};

/**
 * Terminal 404 for the API surface. Mounted after every API router so that an
 * unknown endpoint returns JSON instead of the SPA HTML fallback or the
 * Express default HTML error page.
 */
export const apiNotFoundHandler = (req, res) => {
  res.status(404).json({
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
  });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const mapped = fromDatabaseError(err);
  const status = resolveStatus(mapped);
  const isServerError = status >= 500;

  const payload = {
    message: isServerError
      ? "Internal server error."
      : mapped?.message || "Request failed.",
  };
  if (mapped?.code && !isServerError) payload.code = mapped.code;
  if (mapped?.details !== undefined && !isServerError) {
    payload.details = mapped.details;
  }
  if (req?.requestId) payload.requestId = req.requestId;

  // Technical detail is logged server side only, never returned to clients.
  if (isServerError) {
    console.error(
      JSON.stringify({
        level: "error",
        requestId: req?.requestId,
        method: req?.method,
        path: req?.originalUrl,
        status,
        code: mapped?.code || err?.code,
        message: mapped?.message || String(err),
        stack: isProduction() ? undefined : mapped?.stack || err?.stack,
      }),
    );
  }

  return res.status(status).json(payload);
};
