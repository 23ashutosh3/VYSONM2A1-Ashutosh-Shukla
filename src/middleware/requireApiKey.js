import { HttpError } from './errorHandler.js';
import * as UserService from '../services/user.service.js';

// M2A3 Q3: stops the request with 401 if the x-api-key header is missing or
// does not belong to a user, so the controller never runs. Otherwise the user
// is put on req.user for the controller to use.
export async function requireApiKey(req, res, next) {
  const user = await UserService.findByApiKey(req.get('x-api-key'));
  if (!user) {
    throw new HttpError(401, 'A valid x-api-key header is required');
  }

  req.user = user;
  next();
}
