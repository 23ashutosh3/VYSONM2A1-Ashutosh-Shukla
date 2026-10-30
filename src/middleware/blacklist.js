import { HttpError } from './errorHandler.js';
import * as BlacklistService from '../services/blacklist.service.js';

// M2A3 Q5: stops the request with 403 if its x-api-key is listed in
// config/blacklist.json, before any endpoint logic runs.
export async function blacklist(req, res, next) {
  if (await BlacklistService.isBlocked(req.get('x-api-key'))) {
    throw new HttpError(403, 'This api key is blocked');
  }

  next();
}
