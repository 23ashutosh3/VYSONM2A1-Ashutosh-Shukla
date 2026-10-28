import { randomBytes } from 'node:crypto';
import { DataTypes, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../sequelize.js';

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
for (const column of ['click_count', 'last_accessed_at']) {
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

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
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

// Returns true if a row was removed, false if the code did not exist.
export async function deleteByCode(code) {
  const count = await Url.destroy({ where: { short_code: code } });
  return count > 0;
}

/**
 * Stores the URL under a new short code and returns its row.
 * M2A2 Q4: the same URL can have many short codes, so every call creates a
 * new row instead of returning the code the URL was first given.
 */
export async function shorten(originalUrl) {
  // UNIQUE(short_code) is the real guard; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const row = await Url.create({
        original_url: originalUrl,
        short_code: generateCode(),
        created_at: now(),
      });
      return row.get({ plain: true });
    } catch (err) {
      if (!(err instanceof UniqueConstraintError)) throw err;
    }
  }
  throw new Error('Could not generate a unique short code');
}
