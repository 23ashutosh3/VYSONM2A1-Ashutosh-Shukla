import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point the app at a throwaway database before importing it, so the test
// never touches the committed data/url_shortener.db file.
const dir = mkdtempSync(join(tmpdir(), 'url-shortener-test-'));
process.env.DATABASE_PATH = join(dir, 'test.db');

const { default: app } = await import('../src/app.js');

const INPUT_URL = 'https://example.com';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

test('shortening a URL and following its code redirects to the original', async () => {
  // 1. Call /shorten and store the short code in a variable.
  const shortenResponse = await fetch(`${baseUrl}/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: INPUT_URL }),
  });

  assert.equal(shortenResponse.status, 201);

  const { short_code: shortCode } = await shortenResponse.json();
  assert.match(shortCode, /^[A-Za-z0-9]{8}$/);

  // 2. Call /redirect with that code and check the redirection.
  //    redirect: 'manual' stops fetch from following it, so the 302 and the
  //    Location header can be inspected directly.
  const redirectResponse = await fetch(`${baseUrl}/redirect?code=${shortCode}`, {
    redirect: 'manual',
  });

  assert.equal(redirectResponse.status, 302);
  assert.equal(redirectResponse.headers.get('location'), INPUT_URL);
});
