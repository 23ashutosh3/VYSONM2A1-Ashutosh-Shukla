import * as UrlService from "../services/url.service.js";
import * as HealthService from "../services/health.service.js";

// Controllers only read the request, call a service and shape the response.
// async because the services return promises. Express 5 forwards a rejected
// promise (e.g. an HttpError from a service) to the error handler, so no
// try/catch is needed here.

export async function shorten(req, res) {
  const { url, original_url: originalUrl, expires_at, custom_code, password } = req.body ?? {};

  // M2A2 Q4: always a new row, so always 201.
  const row = await UrlService.shorten({
    url: url ?? originalUrl,
    expiresAt: expires_at,
    customCode: custom_code,
    password,
    apiKey: req.get("x-api-key"),
  });

  res.status(201).json({
    short_code: row.short_code,
    original_url: row.original_url,
    created_at: row.created_at,
    expires_at: row.expires_at,
  });
}

export async function shortenBatch(req, res) {
  const { urls } = req.body ?? {};
  const settled = await UrlService.shortenBatch(req.get("x-api-key"), urls);

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
  const target = await UrlService.resolve(req.query.code, req.query.password);
  res.redirect(302, target);
}

export async function update(req, res) {
  const updated = await UrlService.update(req.params.code, req.get("x-api-key"), req.body);

  res.json({
    short_code: updated.short_code,
    original_url: updated.original_url,
    expires_at: updated.expires_at,
  });
}

// Named remove because delete is a reserved word in JavaScript.
export async function remove(req, res) {
  await UrlService.remove(req.params.code, req.get("x-api-key"));

  // 204: the delete worked and there is nothing left to send back.
  res.status(204).end();
}

export async function list(req, res) {
  const { page, limit, total, rows } = await UrlService.list(req.get("x-api-key"), req.query.page, req.query.limit);

  // Every field is shown, except the password hash: only whether one is set.
  const urls = rows.map(({ password_hash, ...row }) => ({ ...row, has_password: password_hash !== null }));

  res.json({ page, limit, total, urls });
}

// M2A2 Q16: answering at all means the server is up. 503 if the database is down.
export async function health(req, res) {
  const database = (await HealthService.isDatabaseUp()) ? "up" : "down";

  res.status(database === "up" ? 200 : 503).json({
    status: database === "up" ? "ok" : "error",
    server: "up",
    database,
  });
}
