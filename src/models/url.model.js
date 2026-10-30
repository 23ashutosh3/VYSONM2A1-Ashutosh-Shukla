import { db } from '../db.js';

// Q6: raw-SQL version of url.sequelize.model.js, kept for reference only.
// Database queries only; code generation and retries live in the service.

const insertStmt = db.prepare(
  'INSERT INTO url_shortner (original_url, short_code) VALUES (?, ?) RETURNING *',
);
const findByCodeStmt = db.prepare('SELECT * FROM url_shortner WHERE short_code = ?');
const findByUrlStmt = db.prepare('SELECT * FROM url_shortner WHERE original_url = ? LIMIT 1');
const deleteByCodeStmt = db.prepare('DELETE FROM url_shortner WHERE short_code = ?');

// Throws "UNIQUE constraint failed" if short_code is already taken.
export function insert(originalUrl, shortCode) {
  return insertStmt.get(originalUrl, shortCode);
}

// Returns the row, or undefined if the code does not exist.
export function findByCode(code) {
  return findByCodeStmt.get(code);
}

// Returns the first row for this URL, or undefined if there is none.
export function findByUrl(url) {
  return findByUrlStmt.get(url);
}

// Returns { changes } with the number of rows removed.
export function deleteByCode(code) {
  return deleteByCodeStmt.run(code);
}
