# URL Shortener — VYSON M2A1

A URL shortener built with Express and SQLite.

- `POST /shorten` — accepts a long URL, returns a short code
- `GET /redirect?code={code}` — redirects to the original URL

The SQLite database is committed to this repository at
[`data/url_shortener.db`](data/url_shortener.db), so a fresh clone already has
data to work with.

## Requirements

Node.js **22 or newer** — nothing else. Express is the only runtime dependency;
the database uses Node's built-in `node:sqlite` module, so there is no native
build step.

> On Node 22 and 23 `node:sqlite` is still experimental, so the start script
> passes `--experimental-sqlite`. Node prints a one-line warning about this on
> startup, which is expected.

## Run it locally

```bash
npm install
npm start
```

The server starts on <http://localhost:3000>. Use a different port with
`PORT=3001 npm start`.

## Run the tests

```bash
npm test
```

No setup beyond `npm install` — the test starts the app on a free port and
points it at a temporary SQLite database, so it never touches
`data/url_shortener.db`.

```
✔ shortening a URL and following its code redirects to the original (37.218083ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

### What the test covers

[`test/integration.test.js`](test/integration.test.js) walks the full flow end
to end:

1. `POST /shorten` with `https://example.com`, and stores the returned
   `short_code` in a variable.
2. `GET /redirect?code={that code}`, and asserts the response is `302` with a
   `Location` header pointing back at `https://example.com`.

`fetch` is called with `redirect: 'manual'` so it reports the `302` instead of
quietly following it, which is what makes the redirect itself assertable.

## Endpoints

### `POST /shorten`

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://nodejs.org/api/sqlite.html"}'
```

`201 Created`:

```json
{
  "short_code": "1Y0UyJoi",
  "original_url": "https://nodejs.org/api/sqlite.html",
  "created_at": "2026-10-08T17:30:31Z"
}
```

Use the returned `short_code` with the redirect endpoint below.

Shortening the same URL again returns the **same** code with `200 OK` rather
than creating a duplicate row.

| Case | Status |
| ---- | ------ |
| `url` missing or empty | `400` |
| `url` not parseable | `400` |
| scheme other than `http`/`https` | `400` |

### `GET /redirect?code={code}`

```bash
curl -i "http://localhost:3000/redirect?code=mmt"
```

Responds `302 Found` with a `Location` header pointing at the original URL.

| Case | Status |
| ---- | ------ |
| code found | `302` + `Location` |
| `code` query parameter missing | `400` |
| code unknown | `404` |

Three sample rows ship with the database, so `mmt`, `W3School` and
`Vyson-assignment` work immediately after cloning.

## Database

Table `url_shortner`:

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | INTEGER | primary key, autoincrement |
| `original_url` | TEXT | not null |
| `short_code` | TEXT | not null, **unique** |
| `created_at` | TEXT | ISO-8601, defaults to now |

The schema is created on startup (`CREATE TABLE IF NOT EXISTS`), so the app also
works against a missing or empty database file.

Short codes are 8 characters of base62 drawn from `crypto.randomBytes`. The
`UNIQUE` constraint on `short_code` is the real guard against collisions — on a
conflict the insert is retried with a new code.

## Project layout

```
test/integration.test.js        the integration test
src/
  index.js                      server bootstrap, graceful shutdown
  app.js                        express app, middleware, route mounting
  db.js                         SQLite connection + schema
  routes/index.js               the two routes
  controllers/url.controller.js request validation, responses
  models/url.model.js           SQL queries, short-code generation
  middleware/errorHandler.js    HttpError, 404 + error handlers
data/url_shortener.db           the committed SQLite database
```
