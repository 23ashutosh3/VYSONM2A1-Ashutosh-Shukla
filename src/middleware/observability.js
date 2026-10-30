import * as Sentry from '@sentry/node';

// M2A3 Q10 (bonus): server errors are sent to Sentry. SENTRY_DSN comes from
// the Sentry project settings; without it (locally, in tests) nothing is sent.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? 'development',
  });
}

// Error middleware (four arguments), so Express calls it when anything before
// it throws. Sends 5xx errors with the request details, then passes the error
// on to errorHandler, which still sends the response.
export async function reportToSentry(err, req, res, next) {
  const status = err.status ?? 500;

  // 4xx errors are the client's mistake (bad input, wrong key), not bugs.
  if (status >= 500 && Sentry.isInitialized()) {
    Sentry.withScope((scope) => {
      scope.setTag('method', req.method);
      scope.setTag('url', req.originalUrl);
      scope.setTag('status', status);
      if (req.user) scope.setUser({ id: req.user.id, email: req.user.email });
      Sentry.captureException(err);
    });

    // On Vercel the function can be frozen right after the response, so the
    // event is sent before moving on.
    await Sentry.flush(2000);
  }

  next(err);
}
