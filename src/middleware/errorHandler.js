export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

// Express identifies an error handler by its four-argument signature.
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
}
