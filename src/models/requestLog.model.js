import { RequestLog } from '../schemas/index.js';

// Queries on the request_logs table. The table is defined in schemas/requestLog.schema.js.

export function insert(fields) {
  return RequestLog.create(fields);
}
