import { logRequest } from '../services/requestLog.service.js';

// M2A3 Q1: logs every request to the request_logs table.
export function requestLogger(req, res, next) {
  // Not awaited: the request goes on straight away instead of waiting for
  // the write, and a failed write is only reported, never sent to the client.
  logRequest({
    method: req.method,
    // originalUrl, not url: url loses the mount path inside a router.
    url: req.originalUrl,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  }).catch((err) => console.error('Could not save request log:', err));

  next();
}
