import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BLACKLIST_PATH = join(here, '..', '..', 'config', 'blacklist.json');

// M2A3 Q5: the file is read on every call, not once at startup, so keys
// added to config/blacklist.json are blocked without restarting the server.
export async function isBlocked(apiKey) {
  if (!apiKey) return false;

  const { blockedApiKeys } = JSON.parse(await readFile(BLACKLIST_PATH, 'utf8'));
  return blockedApiKeys.includes(apiKey);
}
