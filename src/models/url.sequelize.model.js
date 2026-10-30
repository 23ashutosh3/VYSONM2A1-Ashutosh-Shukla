import { sequelize } from '../sequelize.js';
import { Url } from '../schemas/index.js';

// Sequelize version of url.model.js: database queries on the url_shortner
// table only. The table is defined in schemas/url.schema.js, and every rule
// (code generation, retries, expiry, passwords) lives in services/url.service.js.

// Resolves to the row, or null if the code does not exist.
export function findByCode(code) {
  return Url.findOne({ where: { short_code: code }, raw: true });
}

// Rejects with UniqueConstraintError if short_code is already taken.
export async function insert(fields) {
  const row = await Url.create(fields);
  return row.get({ plain: true });
}

// M2A2 Q3: click_count + 1 runs inside the database, so two visits at the
// same moment are both counted. Resolves to [number of rows updated].
export function incrementVisit(code, accessedAt) {
  return Url.update(
    { click_count: sequelize.literal('click_count + 1'), last_accessed_at: accessedAt },
    { where: { short_code: code } },
  );
}

// M2A2 Q13: sets new values (expires_at, Q14 password_hash).
export function updateCode(code, changes) {
  return Url.update(changes, { where: { short_code: code } });
}

// M2A2 Q15: one page of a user's codes, oldest first, plus the total count.
export function listByUser(userId, limit, offset) {
  return Url.findAndCountAll({
    where: { user_id: userId },
    order: [['id', 'ASC']],
    limit,
    offset,
    raw: true,
  });
}

// Resolves to the number of rows removed.
export function deleteByCode(code) {
  return Url.destroy({ where: { short_code: code } });
}
