import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize } from 'sequelize';

const here = dirname(fileURLToPath(import.meta.url));

// Same file and same env override as the raw-SQL connection in db.js.
export const DB_PATH = process.env.DATABASE_PATH ?? join(here, '..', 'data', 'url_shortener.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false,
});

export function close() {
  return sequelize.close();
}
