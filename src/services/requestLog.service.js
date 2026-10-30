import * as RequestLog from '../models/requestLog.model.js';
import { toIsoText } from '../utils/time.js';

// M2A3 Q1: saves when the request came in, what it asked for and who sent it.
export function logRequest({ method, url, userAgent, ip }) {
  return RequestLog.insert({
    timestamp: toIsoText(),
    method,
    url,
    user_agent: userAgent ?? null,
    ip: ip ?? null,
  });
}
