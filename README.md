# URL Shortener — VYSON M2A1

A URL shortener built with Express and SQLite.

Assignment answers, load test results and screenshots are in [solution.md](solution.md).

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

## Project structure

```
src/
  index.js                       starts the server
  app.js                         Express app setup
  sequelize.js                   Sequelize (ORM) connection, used by the app
  db.js                          raw SQLite connection (kept for reference, not used)
  routes/index.js                POST /shorten, GET /redirect
  controllers/url.controller.js  request validation and responses
  models/url.sequelize.model.js  Sequelize model and queries, used by the app
  models/url.model.js            raw SQL queries (kept for reference, not used)
test/integration.test.js         integration test
loadtest/                        load test script, results and graph script
data/url_shortener.db            SQLite database
```
