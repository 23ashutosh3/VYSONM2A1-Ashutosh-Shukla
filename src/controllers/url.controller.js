// Q6: the raw-SQL model is kept for reference; Sequelize is used instead.
// import * as Url from '../models/url.model.js';
import * as Url from '../models/url.sequelize.model.js';
import { HttpError } from '../middleware/errorHandler.js';

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

// async because Sequelize queries return promises. Express 5 forwards a
// rejected promise to the error handler, so no try/catch is needed here.
export async function shorten(req, res) {
  const { url, original_url: originalUrl } = req.body ?? {};
  const target = parseUrl(url ?? originalUrl);

  const { row, created } = await Url.shorten(target);

  res.status(created ? 201 : 200).json({
    short_code: row.short_code,
    original_url: row.original_url,
    created_at: row.created_at,
  });
}

export async function redirect(req, res) {
  const { code } = req.query;

  if (typeof code !== 'string' || code.trim() === '') {
    throw new HttpError(400, '"code" query parameter is required');
  }

  const row = await Url.findByCode(code.trim());
  if (!row) {
    throw new HttpError(404, `No URL found for code "${code}"`);
  }

  res.redirect(302, row.original_url);
}

// Named remove because delete is a reserved word in JavaScript.
export async function remove(req, res) {
  const { code } = req.params;

  const deleted = await Url.deleteByCode(code);
  if (!deleted) {
    throw new HttpError(404, `No URL found for code "${code}"`);
  }

  // 204: the delete worked and there is nothing left to send back.
  res.status(204).end();
}
