import * as User from '../models/user.model.js';

// Returns the user with this api key, or null if there is none. No api key
// means no user, without asking the database.
export async function findByApiKey(apiKey) {
  if (!apiKey) return null;
  return User.findByApiKey(apiKey);
}
