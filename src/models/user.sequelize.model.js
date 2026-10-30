import { User } from '../schemas/index.js';

// Queries on the users table. The table itself is defined in schemas/user.schema.js.

// Returns the user with this api_key, or null if there is none.
export async function findByApiKey(apiKey) {
  if (!apiKey) return null;
  const row = await User.findOne({ where: { api_key: apiKey }, raw: true });
  return row ?? null;
}
