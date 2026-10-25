import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { Sequelize } from 'sequelize';

const here = dirname(fileURLToPath(import.meta.url));

// Q12: on Vercel the disk is temporary, so a hosted Postgres database is used
// there instead (DATABASE_URL is set by the Neon integration). Locally and in
// tests DATABASE_URL is unset and the SQLite file is used as before.
const DATABASE_URL = process.env.DATABASE_URL;

// Same file and same env override as the raw-SQL connection in db.js.
export const DB_PATH = DATABASE_URL
  ? 'Postgres (DATABASE_URL)'
  : process.env.DATABASE_PATH ?? join(here, '..', 'data', 'url_shortener.db');

export const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      // Passed explicitly so Vercel's bundler includes the driver; Sequelize
      // otherwise loads it with a dynamic require the bundler cannot see.
      dialectModule: pg,
      dialectOptions: { ssl: true },
      logging: false,
    })
  : createSqlite();

function createSqlite() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  return new Sequelize({
    dialect: 'sqlite',
    storage: DB_PATH,
    logging: false,
  });
}

export function close() {
  return sequelize.close();
}
