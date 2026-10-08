import * as Url from '../models/url.model.js';
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
  return parsed.href;
}

export function shorten(req, res) {
  const { url, original_url: originalUrl } = req.body ?? {};
  const target = parseUrl(url ?? originalUrl);

  const { row, created } = Url.shorten(target);
  const base = `${req.protocol}://${req.get('host')}`;

  res.status(created ? 201 : 200).json({
    short_code: row.short_code,
    short_url: `${base}/redirect?code=${row.short_code}`,
    original_url: row.original_url,
    created_at: row.created_at,
  });
}

export function redirect(req, res) {
  const { code } = req.query;

  if (typeof code !== 'string' || code.trim() === '') {
    throw new HttpError(400, '"code" query parameter is required');
  }

  const row = Url.findByCode(code.trim());
  if (!row) {
    throw new HttpError(404, `No URL found for code "${code}"`);
  }

  Url.recordVisit(row.short_code);
  res.redirect(302, row.original_url);
}
