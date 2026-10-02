import { db, close, DB_PATH } from '../src/db.js';

// Carried over from the Postgres table this assignment started from.
// The generated example.com/page/N rows were bulk filler and are left out.
const SEED = [
  ['https://swap.notion.site/VYSONM1A1-URL-Shortener', 'Vyson-assignment'],
  ['https://www.w3schools.com/sql/sql_create_table.asp', 'W3School'],
  ['https://www.makemytrip.com/hotels/hotel-listing/', 'mmt'],
];

const insert = db.prepare(
  'INSERT OR IGNORE INTO url_shortner (original_url, short_code) VALUES (?, ?)',
);

let inserted = 0;
db.exec('BEGIN');
try {
  for (const [url, code] of SEED) inserted += insert.run(url, code).changes;
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}

const { total } = db.prepare('SELECT count(*) AS total FROM url_shortner').get();
console.log(`Seeded ${inserted} new row(s); ${total} total in ${DB_PATH}`);
close();
