import { randomBytes } from 'node:crypto';
import { db } from '../db.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 8;

const insertStmt = db.prepare(
  'INSERT INTO url_shortner (original_url, short_code) VALUES (?, ?) RETURNING *',
);
const findByCodeStmt = db.prepare('SELECT * FROM url_shortner WHERE short_code = ?');
const findByUrlStmt = db.prepare('SELECT * FROM url_shortner WHERE original_url = ? LIMIT 1');
const deleteByCodeStmt = db.prepare('DELETE FROM url_shortner WHERE short_code = ?');

function generateCode() {
  // randomBytes avoids the modulo bias of Math.random-based pickers.
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

function isUniqueViolation(err) {
  return /UNIQUE constraint failed/i.test(err?.message ?? '');
}

export function findByCode(code) {
  return findByCodeStmt.get(code) ?? null;
}

// Returns true if a row was removed, false if the code did not exist.
export function deleteByCode(code) {
  return deleteByCodeStmt.run(code).changes > 0;
}

// Internal only: shorten() uses it to keep repeat requests idempotent.
function findByUrl(url) {
  return findByUrlStmt.get(url) ?? null;
}

/**
 * Stores the URL and returns its row. The same URL always maps back to the
 * code it was first given, so repeat calls stay idempotent.
 */
export function shorten(originalUrl) {
  const existing = findByUrl(originalUrl);
  if (existing) return { row: existing, created: false };

  // UNIQUE(short_code) is the real guard; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return { row: insertStmt.get(originalUrl, generateCode()), created: true };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error('Could not generate a unique short code');
}
