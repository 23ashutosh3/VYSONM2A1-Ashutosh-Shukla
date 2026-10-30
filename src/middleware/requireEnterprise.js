import { HttpError } from './errorHandler.js';

// M2A3 Q4: stops the request with 403 unless the user is on the enterprise
// tier. Runs after requireApiKey, which puts the user on req.user.
export function requireEnterprise(req, res, next) {
  if (req.user.tier !== 'enterprise') {
    throw new HttpError(403, 'This endpoint is only available on the enterprise tier');
  }

  next();
}
