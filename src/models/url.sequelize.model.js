import { UniqueConstraintError } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { Url } from '../schemas/index.js';

// Sequelize version of url.model.js: queries on the url_shortner table only.
// The table is defined in schemas/url.schema.js, and the rules (code
// generation, expiry, passwords) live in services/url.service.js.

export async function findByCode(code) {
  const row = await Url.findOne({ where: { short_code: code }, raw: true });
  return row ?? null;
}

// Inserts a row and returns it, or null if its short_code is already taken.
export async function insert(fields) {
  try {
    const row = await Url.create(fields);
    return row.get({ plain: true });
  } catch (err) {
    if (err instanceof UniqueConstraintError) return null;
    throw err;
  }
}

/**
 * M2A2 Q3: counts a visit and returns the row, or null if the code does not
 * exist. click_count + 1 runs inside the database, so two visits at the same
 * moment are both counted instead of one overwriting the other.
 */
export async function recordVisit(code, accessedAt) {
  const [count] = await Url.update(
    { click_count: sequelize.literal('click_count + 1'), last_accessed_at: accessedAt },
    { where: { short_code: code } },
  );
  if (count === 0) return null;
  return findByCode(code);
}

// M2A2 Q13: sets new values (expires_at, Q14 password_hash) and returns the updated row.
export async function updateCode(code, changes) {
  await Url.update(changes, { where: { short_code: code } });
  return findByCode(code);
}

// M2A2 Q15: one page of a user's codes, oldest first, plus the total count.
export async function listByUser(userId, limit, offset) {
  const { rows, count } = await Url.findAndCountAll({
    where: { user_id: userId },
    order: [['id', 'ASC']],
    limit,
    offset,
    raw: true,
  });
  return { rows, total: count };
}

// Returns true if a row was removed, false if the code did not exist.
export async function deleteByCode(code) {
  const count = await Url.destroy({ where: { short_code: code } });
  return count > 0;
}
