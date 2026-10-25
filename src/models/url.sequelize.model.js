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
 * Stores the URL and returns its row. The same URL always maps back to the
 * code it was first given, so repeat calls stay idempotent.
 */
export async function shorten(originalUrl) {
  const existing = await Url.findOne({ where: { original_url: originalUrl }, raw: true });
  if (existing) return { row: existing, created: false };

  // UNIQUE(short_code) is the real guard; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const row = await Url.create({
        original_url: originalUrl,
        short_code: generateCode(),
        created_at: now(),
      });
      return { row: row.get({ plain: true }), created: true };
    } catch (err) {
      if (!(err instanceof UniqueConstraintError)) throw err;
    }
  }
  throw new Error('Could not generate a unique short code');
}
