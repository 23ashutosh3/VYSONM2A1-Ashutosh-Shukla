// M2A3 Q9 (bonus): times each middleware for internal tracking.

// Wraps a middleware so its own time is saved on req.timings. The time runs
// from when it starts until it calls next() (so the middlewares after it are
// not counted), or until it stops the request (throws, rejects or responds).
export function timed(name, middleware) {
  return function (req, res, next) {
    const start = process.hrtime.bigint();
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      (req.timings ??= []).push(`${name}=${ms.toFixed(3)}ms`);
    };

    // If it ends the request itself instead of calling next().
    res.once('finish', stop);

    let result;
    try {
      result = middleware(req, res, (...args) => {
        stop();
        next(...args);
      });
    } catch (err) {
      stop();
      throw err;
    }

    // Async middleware: returned so Express 5 still sees a rejection.
    if (result && typeof result.then === 'function') return result.finally(stop);
    return result;
  };
}

// Prints one line per request with every middleware's time, once the
// response has been sent.
export function logMiddlewareTimings(req, res, next) {
  res.once('finish', () => {
    console.log(`[middleware timing] ${req.method} ${req.originalUrl} ${(req.timings ?? []).join(' ')}`);
  });
  next();
}
