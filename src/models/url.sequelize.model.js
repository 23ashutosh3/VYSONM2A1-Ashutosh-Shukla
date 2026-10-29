import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DataTypes, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../sequelize.js';
// M2A2 Q5: imported first so the users table exists before user_id points at it.
import { User } from './user.sequelize.model.js';

// Sequelize version of url.model.js. Same table, same behaviour, but the
// queries are built by the ORM instead of written as SQL strings.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 8;

export const Url = sequelize.define(
  'Url',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    original_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    short_code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    // Stored as ISO-8601 text ("2026-10-08T17:30:31Z") to match the rows the
    // raw-SQL version wrote, rather than Sequelize's own DATE format.
    created_at: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // M2A2 Q3: how many times /redirect was called for this code, and when
    // it was last called (null until the first visit).
    click_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_accessed_at: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // M2A2 Q5: owner of the short code (null for codes created without an api_key).
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
    },
    // M2A2 Q8: after this time /redirect returns 410 (null = never expires).
    expires_at: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // M2A2 Q14: optional password as "salt:hash" (null = no password).
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'url_shortner',
    timestamps: false,
    // Same name as the index db.js creates, so sync() sees it as existing.
    indexes: [{ name: 'idx_url_shortner_created_at', fields: ['created_at'] }],
  },
);

// Creates the table if it is missing; an existing table is left untouched.
await Url.sync();

// sync() does not add new columns to a table that already exists, so tables
// created before M2A2 Q3 (the SQLite file, Neon) get them added here.
const existingColumns = await sequelize.getQueryInterface().describeTable('url_shortner');
for (const column of ['click_count', 'last_accessed_at', 'user_id', 'expires_at', 'password_hash']) {
  if (!existingColumns[column]) {
    await sequelize.getQueryInterface().addColumn('url_shortner', column, Url.getAttributes()[column]);
  }
}

function generateCode() {
  // randomBytes avoids the modulo bias of Math.random-based pickers.
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

// Same ISO-8601 text as created_at, e.g. "2026-10-08T17:30:31Z".
export function toIsoText(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function now() {
  return toIsoText();
}

// M2A2 Q8: true if the row has an expiry time and it has passed.
export function isExpired(row) {
  return row.expires_at !== null && new Date(row.expires_at) <= new Date();
}

// M2A2 Q14: scrypt with a random salt, so the plain password is never stored.
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

// M2A2 Q14: true if the code has no password or the given one matches.
export function checkPassword(row, password) {
  if (row.password_hash === null) return true;
  if (typeof password !== 'string') return false;
  const [salt, hash] = row.password_hash.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}

export async function findByCode(code) {
  const row = await Url.findOne({ where: { short_code: code }, raw: true });
  return row ?? null;
}

/**
 * M2A2 Q3: counts a visit and returns the row, or null if the code does not
 * exist. click_count + 1 runs inside the database, so two visits at the same
 * moment are both counted instead of one overwriting the other.
 */
export async function recordVisit(code) {
  const [count] = await Url.update(
    { click_count: sequelize.literal('click_count + 1'), last_accessed_at: now() },
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

// Returns true if a row was removed, false if the code did not exist.
export async function deleteByCode(code) {
  const count = await Url.destroy({ where: { short_code: code } });
  return count > 0;
}

/**
 * Stores the URL under a new short code and returns its row.
 * M2A2 Q4: the same URL can have many short codes, so every call creates a
 * new row instead of returning the code the URL was first given.
 * M2A2 Q9: with customCode, that code is used instead of a random one and
 * null is returned if it is already taken.
 * M2A2 Q14: passwordHash is the hashed optional password.
 */
export async function shorten(originalUrl, userId = null, expiresAt = null, customCode = null, passwordHash = null) {
  // UNIQUE(short_code) is the real guard; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const row = await Url.create({
        original_url: originalUrl,
        short_code: customCode ?? generateCode(),
        created_at: now(),
        // M2A2 Q5: owner of the code, from the api_key header.
        user_id: userId,
        // M2A2 Q8: optional expiry time.
        expires_at: expiresAt,
        password_hash: passwordHash,
      });
      return row.get({ plain: true });
    } catch (err) {
      if (!(err instanceof UniqueConstraintError)) throw err;
      // A custom code is not retried: the user picked it, so it is just taken.
      if (customCode) return null;
    }
  }
  throw new Error('Could not generate a unique short code');
}
