import { randomBytes } from 'node:crypto';
// Q6: the raw-SQL model is kept for reference; Sequelize is used instead.
// import * as Url from '../models/url.model.js';
import * as Url from '../models/url.sequelize.model.js';
import * as User from '../models/user.sequelize.model.js';
import { HttpError } from '../middleware/errorHandler.js';
import { checkPassword, hashPassword } from '../utils/password.js';
import { isExpired, toIsoText } from '../utils/time.js';

// The rules of the URL shortener. Controllers pass in the raw request values
// and get back rows; the models below only run queries.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 8;
const MAX_BATCH_SIZE = 100;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

// Only http(s) is accepted; javascript: and data: URLs would make the
// redirect endpoint a vector for running script in a visitor's browser.
function parseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, '"url" is required');
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new HttpError(400, `"${value}" is not a valid URL`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, 'Only http and https URLs can be shortened');
  }

  // Store what the caller sent rather than parsed.href, so the redirect
  // Location is byte-identical to the URL they shortened. parsed.href would
  // rewrite "https://example.com" as "https://example.com/".
  return value.trim();
}

// M2A2 Q8: expires_at is optional, stored in the same format as created_at.
function parseExpiresAt(value) {
  if (value === undefined || value === null) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `"${value}" is not a valid expires_at date`);
  }

  return toIsoText(date);
}

// M2A2 Q14: password is optional; it is stored hashed, null means none.
function parsePassword(value) {
  if (value === undefined || value === null) return null;

  if (typeof value !== 'string' || value === '') {
    throw new HttpError(400, '"password" must be a non-empty string');
  }

  return hashPassword(value);
}

function generateCode() {
  // randomBytes avoids the modulo bias of Math.random-based pickers.
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

/**
 * Stores the URL under a new short code and returns its row.
 * M2A2 Q4: the same URL can have many short codes, so every call creates a
 * new row instead of returning the code the URL was first given.
 * M2A2 Q9: with customCode, that code is used instead of a random one and
 * 409 is thrown if it is already taken.
 */
async function createCode(originalUrl, userId, expiresAt, customCode, passwordHash = null) {
  // UNIQUE(short_code) is the real guard; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const row = await Url.insert({
      original_url: originalUrl,
      short_code: customCode ?? generateCode(),
      created_at: toIsoText(),
      // M2A2 Q5: owner of the code, from the api_key header.
      user_id: userId,
      // M2A2 Q8: optional expiry time.
      expires_at: expiresAt,
      password_hash: passwordHash,
    });
    if (row) return row;

    // A custom code is not retried: the user picked it, so it is just taken.
    if (customCode) {
      throw new HttpError(409, `Short code "${customCode}" is not available, try another one`);
    }
  }
  throw new Error('Could not generate a unique short code');
}

// M2A2 Q5: only the user who owns the code can change or delete it.
async function findOwnedCode(code, apiKey) {
  const row = await Url.findByCode(code);
  if (!row) {
    throw new HttpError(404, `No URL found for code "${code}"`);
  }

  const user = await User.findByApiKey(apiKey);
  if (!user || row.user_id !== user.id) {
    throw new HttpError(403, 'You do not own this short code');
  }

  return row;
}

export async function shorten({ url, expiresAt, customCode, password, apiKey }) {
  const target = parseUrl(url);
  const expires = parseExpiresAt(expiresAt);
  const passwordHash = parsePassword(password);

  // M2A2 Q5: the api key comes from the x-api-key header, not the body or URL.
  const user = await User.findByApiKey(apiKey);

  return createCode(target, user?.id ?? null, expires, customCode ?? null, passwordHash);
}

// Batch: shortens many URLs. Each item is handled on its own, so one bad URL
// does not stop the others; returns one Promise.allSettled outcome per item.
export async function shortenBatch(apiKey, urls) {
  // M2A2 Q12: bulk creation is only for the enterprise tier.
  const user = await User.findByApiKey(apiKey);
  if (user?.tier !== 'enterprise') {
    throw new HttpError(403, 'Bulk creation is only available on the enterprise tier');
  }

  if (!Array.isArray(urls) || urls.length === 0) {
    throw new HttpError(400, '"urls" must be a non-empty array');
  }
  if (urls.length > MAX_BATCH_SIZE) {
    throw new HttpError(400, `At most ${MAX_BATCH_SIZE} URLs can be shortened in one request`);
  }

  // allSettled, not all: every item finishes and reports its own result,
  // instead of the whole batch failing on the first error.
  return Promise.allSettled(
    urls.map(async (item) => {
      const target = parseUrl(item?.url);
      const expiresAt = parseExpiresAt(item?.expires_at);
      return createCode(target, user.id, expiresAt, item?.custom_code ?? null);
    }),
  );
}

// Returns the URL to redirect to for this code.
export async function resolve(code, password) {
  if (typeof code !== 'string' || code.trim() === '') {
    throw new HttpError(400, '"code" query parameter is required');
  }

  // Also counts the visit: click_count and last_accessed_at (M2A2 Q3).
  const row = await Url.recordVisit(code.trim(), toIsoText());
  if (!row) {
    throw new HttpError(404, `No URL found for code "${code}"`);
  }

  // M2A2 Q8: 410 Gone, the code existed but has expired.
  if (isExpired(row)) {
    throw new HttpError(410, `Short code "${code}" has expired`);
  }

  // M2A2 Q14: a password-protected code needs the right ?password=.
  if (!checkPassword(row, password)) {
    throw new HttpError(401, `Short code "${code}" needs the correct password`);
  }

  return row.original_url;
}

// M2A2 Q13: the owner edits expires_at. A time in the past makes the code
// inactive, a future time (or null for no expiry) makes it active again.
// M2A2 Q14: password can be edited too (null removes it).
export async function update(code, apiKey, body) {
  await findOwnedCode(code, apiKey);

  const changes = {};
  if (body && 'expires_at' in body) changes.expires_at = parseExpiresAt(body.expires_at);
  if (body && 'password' in body) changes.password_hash = parsePassword(body.password);

  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, '"expires_at" or "password" is required');
  }

  return Url.updateCode(code, changes);
}

export async function remove(code, apiKey) {
  await findOwnedCode(code, apiKey);
  await Url.deleteByCode(code);
}

// M2A2 Q15: one page of the api key's user's short codes. A user can have
// thousands, so the list is paged with page and limit.
export async function list(apiKey, pageParam, limitParam) {
  const user = await User.findByApiKey(apiKey);
  if (!user) {
    throw new HttpError(401, 'A valid x-api-key header is required');
  }

  const page = Number(pageParam ?? 1);
  const limit = Number(limitParam ?? DEFAULT_PAGE_SIZE);
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError(400, '"page" must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new HttpError(400, `"limit" must be an integer from 1 to ${MAX_PAGE_SIZE}`);
  }

  const { rows, total } = await Url.listByUser(user.id, limit, (page - 1) * limit);
  return { page, limit, total, rows };
}
