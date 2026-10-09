import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// node:sqlite needs --experimental-sqlite on Node 22 and 23. Importing it
// statically without the flag fails with a bare ERR_UNKNOWN_BUILTIN_MODULE
// stack trace, so it is loaded here with a message that says what to do.
let DatabaseSync;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  console.error(
    'This app needs Node\'s SQLite module.\n\n' +
      `  You are on Node ${process.version}, where it is still experimental.\n` +
      '  Start the app with "npm start" (or "npm test"), which passes the\n' +
      '  required --experimental-sqlite flag, rather than running node directly.\n',
  );
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));

// The SQLite file lives inside the repository so it is version controlled.
export const DB_PATH = process.env.DATABASE_PATH ?? join(here, '..', 'data', 'url_shortener.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');

// Schema is created on boot, so a fresh clone works without a migration step.
db.exec(`
  CREATE TABLE IF NOT EXISTS url_shortner (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT    NOT NULL,
    short_code   TEXT    NOT NULL UNIQUE,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_url_shortner_created_at ON url_shortner (created_at);
`);

export function close() {
  db.close();
}
