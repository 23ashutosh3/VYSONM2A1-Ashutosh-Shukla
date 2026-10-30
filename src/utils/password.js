import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// M2A2 Q14: scrypt with a random salt, so the plain password is never stored.
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

// M2A2 Q14: true if the code has no password or the given one matches.
export function checkPassword(row, password) {
  if (row.password_hash === null) return true;
  if (typeof password !== 'string') return false;
  const [salt, hash] = row.password_hash.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}
