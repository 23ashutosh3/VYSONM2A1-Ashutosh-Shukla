import { sequelize } from '../sequelize.js';
import { User } from './user.schema.js';
import { Url } from './url.schema.js';
import { RequestLog } from './requestLog.schema.js';

// Creates the table if it is missing; an existing table is left untouched.
// sync() does not add new columns to a table that already exists, so tables
// created before those columns were added (the SQLite file, Neon) get them
// added here.
async function syncTable(model, addedColumns) {
  await model.sync();

  const queryInterface = sequelize.getQueryInterface();
  const existingColumns = await queryInterface.describeTable(model.tableName);
  for (const column of addedColumns) {
    if (!existingColumns[column]) {
      await queryInterface.addColumn(model.tableName, column, model.getAttributes()[column]);
    }
  }
}

// Runs once, on first import, so every entry point (server, tests, Vercel)
// has its tables ready. users goes first so user_id has a table to point at.
await syncTable(User, ['tier']);
await syncTable(Url, ['click_count', 'last_accessed_at', 'user_id', 'expires_at', 'password_hash']);
await syncTable(RequestLog, []);

export { User, Url, RequestLog };
