# URL Shortener — VYSON M2A1

A small URL shortener built with Express and SQLite.

- `POST /shorten` — accepts a long URL, returns a short code
- `GET /redirect?code={code}` — redirects to the original URL

The SQLite database is committed to this repository at
[`data/url_shortener.db`](data/url_shortener.db), so a fresh clone already has
data to work with.

## Requirements

Node.js **22 or newer** — nothing else. Express is the only runtime dependency;
the database uses Node's built-in `node:sqlite` module, so there is no native
build step.

> On Node 22 and 23, `node:sqlite` is still experimental, so the npm scripts
> pass `--experimental-sqlite`. Node prints a one-line warning about this on
> startup, which is expected. On Node 24+ the flag is harmless.

## Run it locally

```bash
npm install
npm start
```

The server starts on <http://localhost:3000>. Use a different port with
`PORT=3001 npm start`.

Other scripts:

```bash
npm run dev    # restart automatically when a file changes
npm test       # run the test suite (10 tests)
npm run seed   # re-insert the seed rows (safe to run repeatedly)
```

## Endpoints

### `POST /shorten`

Request:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://nodejs.org/api/sqlite.html"}'
```

Response — `201 Created`:

```json
{
  "short_code": "1Y0UyJoi",
  "short_url": "http://localhost:3000/redirect?code=1Y0UyJoi",
  "original_url": "https://nodejs.org/api/sqlite.html",
  "created_at": "2026-10-02T17:57:25Z"
}
```

Shortening the same URL again returns the **same** code with `200 OK` rather
than creating a duplicate row.

Errors:

| Case | Status |
| ---- | ------ |
| `url` missing or empty | `400` |
| `url` not parseable | `400` |
| scheme other than `http`/`https` | `400` |

### `GET /redirect?code={code}`

```bash
curl -i "http://localhost:3000/redirect?code=mmt"
```

Responds `302 Found` with a `Location` header pointing at the original URL, and
increments that row's `visit_count`.

| Case | Status |
| ---- | ------ |
| code found | `302` + `Location` |
| `code` query parameter missing | `400` |
| code unknown | `404` |

### Extras

- `GET /health` — liveness check
- `GET /stats` — total URLs and total visits

## Database

Table `url_shortner`:

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | INTEGER | primary key, autoincrement |
| `original_url` | TEXT | not null |
| `short_code` | TEXT | not null, **unique** |
| `created_at` | TEXT | ISO-8601, defaults to now |
| `visit_count` | INTEGER | not null, defaults to 0 |

The schema is created on startup (`CREATE TABLE IF NOT EXISTS`), so the app
works against an empty or missing database file without a migration step.

Short codes are 8 characters of base62 drawn from `crypto.randomBytes`. The
`UNIQUE` constraint on `short_code` is the real guard against collisions — on
the rare conflict the insert is retried with a new code.

## Project layout

```
src/
  index.js                      server bootstrap, graceful shutdown
  app.js                        express app, middleware, route mounting
  db.js                         SQLite connection + schema
  routes/index.js               route definitions
  controllers/url.controller.js request validation, responses
  models/url.model.js           SQL queries, short-code generation
  middleware/errorHandler.js    HttpError, 404 + error handlers
scripts/seed.js                 inserts the seed rows
test/url.test.js                test suite
data/url_shortener.db           the committed SQLite database
```
