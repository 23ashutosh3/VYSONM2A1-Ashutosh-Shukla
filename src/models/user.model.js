import { User } from '../schemas/index.js';

// Queries on the users table. The table itself is defined in schemas/user.schema.js.

// Resolves to the user with this api_key, or null if there is none.
export function findByApiKey(apiKey) {
  return User.findOne({ where: { api_key: apiKey }, raw: true });
}
