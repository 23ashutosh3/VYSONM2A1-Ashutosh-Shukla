// Same ISO-8601 text as created_at, e.g. "2026-10-08T17:30:31Z".
export function toIsoText(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// M2A2 Q8: true if the row has an expiry time and it has passed.
export function isExpired(row) {
  return row.expires_at !== null && new Date(row.expires_at) <= new Date();
}
