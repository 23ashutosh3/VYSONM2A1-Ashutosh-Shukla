// Q6: the raw-SQL model is kept for reference; Sequelize is used instead.
// import * as Url from '../models/url.model.js';
import * as Url from "../models/url.sequelize.model.js";
import * as User from "../models/user.sequelize.model.js";
import { HttpError } from "../middleware/errorHandler.js";

// Only http(s) is accepted; javascript: and data: URLs would make the
// redirect endpoint a vector for running script in a visitor's browser.
function parseUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, '"url" is required');
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new HttpError(400, `"${value}" is not a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Only http and https URLs can be shortened");
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

  return Url.toIsoText(date);
}

// async because Sequelize queries return promises. Express 5 forwards a
// rejected promise to the error handler, so no try/catch is needed here.
export async function shorten(req, res) {
  const { url, original_url: originalUrl, expires_at, custom_code } = req.body ?? {};
  const target = parseUrl(url ?? originalUrl);
  const expiresAt = parseExpiresAt(expires_at);

  // M2A2 Q5: the api key comes from the x-api-key header, not the body or URL.
  const user = await User.findByApiKey(req.get("x-api-key"));

  // M2A2 Q4: always a new row, so always 201.
  // M2A2 Q9: optional custom_code is used as the short code if it is free.
  const row = await Url.shorten(target, user?.id ?? null, expiresAt, custom_code ?? null);
  if (!row) {
    throw new HttpError(409, `Short code "${custom_code}" is not available, try another one`);
  }

  res.status(201).json({
    short_code: row.short_code,
    original_url: row.original_url,
    created_at: row.created_at,
    expires_at: row.expires_at,
  });
}

const MAX_BATCH_SIZE = 100;

// Batch: shortens many URLs in one request. Each item is handled on its own,
// so one bad URL does not stop the others.
export async function shortenBatch(req, res) {
  const { urls } = req.body ?? {};

  if (!Array.isArray(urls) || urls.length === 0) {
    throw new HttpError(400, '"urls" must be a non-empty array');
  }
  if (urls.length > MAX_BATCH_SIZE) {
    throw new HttpError(400, `At most ${MAX_BATCH_SIZE} URLs can be shortened in one request`);
  }

  const user = await User.findByApiKey(req.get("x-api-key"));

  // allSettled, not all: every item finishes and reports its own result,
  // instead of the whole batch failing on the first error.
  const settled = await Promise.allSettled(
    urls.map(async (item) => {
      const target = parseUrl(item?.url);
      const expiresAt = parseExpiresAt(item?.expires_at);
      const row = await Url.shorten(target, user?.id ?? null, expiresAt, item?.custom_code ?? null);
      if (!row) {
        throw new HttpError(409, `Short code "${item.custom_code}" is not available, try another one`);
      }
      return row;
    }),
  );

  // Each result says which item it is (index, url, custom_code) so the
  // caller can see exactly which one failed and why.
  const results = settled.map((outcome, index) => {
    const item = { index, url: urls[index]?.url ?? null, custom_code: urls[index]?.custom_code ?? null };

    if (outcome.status === "fulfilled") {
      const row = outcome.value;
      return {
        ...item,
        status: 201,
        short_code: row.short_code,
        created_at: row.created_at,
        expires_at: row.expires_at,
      };
    }

    const status = outcome.reason.status ?? 500;
    if (status >= 500) console.error(outcome.reason);
    return {
      ...item,
      status,
      error: status >= 500 ? "Internal server error" : outcome.reason.message,
    };
  });

  const created = results.filter((result) => result.status === 201).length;

  // 201 when every URL was shortened, 207 Multi-Status when some failed.
  res.status(created === results.length ? 201 : 207).json({
    created,
    failed: results.length - created,
    results,
  });
}

export async function redirect(req, res) {
  const { code } = req.query;

  if (typeof code !== "string" || code.trim() === "") {
    throw new HttpError(400, '"code" query parameter is required');
  }

  // Also  click_count and last_accessed_at (M2A2 Q3).
  const row = await Url.recordVisit(code.trim());
  if (!row) {
    throw new HttpError(404, `No URL found for code "${code}"`);
  }

  // M2A2 Q8: 410 Gone, the code existed but has expired.
  if (Url.isExpired(row)) {
    throw new HttpError(410, `Short code "${code}" has expired`);
  }

  res.redirect(302, row.original_url);
}

// Named remove because delete is a reserved word in JavaScript.
export async function remove(req, res) {
  const { code } = req.params;

  const row = await Url.findByCode(code);
  if (!row) {
    throw new HttpError(404, `No URL found for code "${code}"`);
  }

  // M2A2 Q5: only the user who owns the code can delete it.
  const user = await User.findByApiKey(req.get("x-api-key"));
  if (!user || row.user_id !== user.id) {
    throw new HttpError(403, "You do not own this short code");
  }

  await Url.deleteByCode(code);

  // 204: the delete worked and there is nothing left to send back.
  res.status(204).end();
}
