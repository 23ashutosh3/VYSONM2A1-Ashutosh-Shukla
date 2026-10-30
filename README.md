# URL Shortener — VYSON M2A1

A URL shortener built with Express and SQLite.

## Answers to all the assignment questions, load test results and screenshots are in [solution.md](solution.md).

## Requirements

- Node.js **22 or newer**

## Run it

```bash
git clone <this-repo-url>
cd VYSONM2A1-Ashutosh-Shukla
npm install
npm start
```

The server runs on <http://localhost:3000>. To use another port: `PORT=3001 npm start`.

Always start with `npm start`, not `node src/index.js`. The npm script adds the `--experimental-sqlite` flag that Node 22 and 23 need. A one-line "ExperimentalWarning" on startup is normal.

## Try it

```bash
# Shorten a URL
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
# → {"short_code":"W1VJi5g8","original_url":"https://example.com",...}

# Follow a short code
curl -i "http://localhost:3000/redirect?code=W1VJi5g8"
# → 302 Found, Location: https://example.com
```

These codes already exist in the database and work right after cloning: `mmt`, `W3School`, `Vyson-assignment`, `W1VJi5g8`.

## Run the tests

```bash
npm test
```

The test uses a temporary database, so it does not change `data/url_shortener.db`.

## Access the database

The SQLite database is committed to the repo at [`data/url_shortener.db`](data/url_shortener.db), so anyone who clones it gets the data. No database server or login is needed: it is a single file.

The table is named `url_shortner`.

**Terminal** (`sqlite3` comes with macOS. On Linux, install it with `sudo apt install sqlite3`. On Windows, download it from [sqlite.org](https://sqlite.org/download.html)):

```bash
sqlite3 -header -column data/url_shortener.db "SELECT * FROM url_shortner;"
```

**VS Code:** install the **SQLite Viewer** extension, then click `data/url_shortener.db` in the file explorer.

**Desktop app:** open the file in [DB Browser for SQLite](https://sqlitebrowser.org/).

Stop the server (Ctrl+C) before opening the file, so every recent write is saved into the `.db` file.

## Deployment (Vercel)

Vercel does not keep files between requests, so the SQLite file cannot be used there. The deployed app uses a hosted **Postgres** database (Neon) through the `pg` driver instead.

Live URL: https://vyson-url-shortener.vercel.app

## Load testing

The files in `loadtest/` send many requests at the same time and record how fast the API responds (p50, p90, p95 and p99 latency, requests per second, and how many requests failed).

| File | What it is |
|---|---|
| `loadtest/run.sh` | Load test that uses the [oha](https://github.com/hatoo/oha) tool. It tests the local server by default; set `BASE`, `OUT` and `LEVELS` to test another URL. Writes `results.csv`. |
| `loadtest/bench.mjs` | The same load test written in Node, so no extra tool is needed. Used to compare the local server with the Vercel deployment. |
| `loadtest/results-local-node.csv` | `bench.mjs` results for the local server (Express + SQLite). |
| `loadtest/results-vercel.csv` | `bench.mjs` results for the Vercel deployment (Vercel Function + Neon Postgres). |

```bash
# run.sh: start the server with `npm start` first
./loadtest/run.sh <short_code>
BASE=https://vyson-url-shortener.vercel.app OUT=loadtest/results-vercel.csv LEVELS="10 50 100" ./loadtest/run.sh <short_code>

# bench.mjs: node loadtest/bench.mjs <base_url> <short_code> <output.csv> [levels]
node loadtest/bench.mjs http://localhost:3000 <short_code> loadtest/results-local-node.csv "10 50 100 200"
node loadtest/bench.mjs https://vyson-url-shortener.vercel.app <short_code> loadtest/results-vercel.csv "10 50 100 200"
```

Each level sends 10 requests per concurrent connection, and any request slower than 5 seconds counts as failed. The comparison and observations are in [solution.md](solution.md) (Q12 and Q13).


## Project structure

```
src/
  index.js                       starts the server
  app.js                         Express app setup
  sequelize.js                   Sequelize (ORM) connection, used by the app
  db.js                          raw SQLite connection (kept for reference, not used)
  routes/index.js                maps each endpoint to a controller
  controllers/url.controller.js  reads the request, calls a service, sends the response
  services/url.service.js        validation and business rules, calls the models
  services/health.service.js     database check for GET /health
  models/url.model.js            database queries on url_shortner
  models/user.model.js           database queries on users
  schemas/url.schema.js          url_shortner table definition
  schemas/user.schema.js         users table definition
  schemas/index.js               creates the tables and adds missing columns
  utils/password.js              password hashing and checking
  utils/time.js                  ISO-8601 time text and expiry check
  legacy/url.raw.model.js        raw SQL queries (kept for reference, not used)
test/integration.test.js         integration test
loadtest/                        load test script, results and graph script
data/url_shortener.db            SQLite database
```
