// M2A3 Q6: adds the time the request took as an X-Response-Time header.
export function responseTime(req, res, next) {
  // Start time, when the request passes through this middleware.
  const start = process.hrtime.bigint();

  // Coming back: Node calls writeHead just before the headers are sent, for
  // res.json, res.redirect and res.end alike. That is the last moment a
  // header can still be added (on 'finish' they are already sent).
  const writeHead = res.writeHead;
  res.writeHead = function (...args) {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    this.setHeader('X-Response-Time', `${elapsedMs.toFixed(3)}ms`);
    return writeHead.apply(this, args);
  };

  next();
}
