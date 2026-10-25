import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
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

// Q7: sending the same URL twice must return the same short code.
test('shortening the same URL twice returns the same short code', async () => {
  // A random path makes the URL new on every run, so the first call is a
  // genuine create rather than a hit on a row left by an earlier test.
  const randomUrl = `https://example.com/${randomBytes(8).toString('hex')}`;

  const shorten = () =>
    fetch(`${baseUrl}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: randomUrl }),
    });

  // 1. First call creates the row.
  const firstResponse = await shorten();
  assert.equal(firstResponse.status, 201);
  const first = await firstResponse.json();

  // 2. Second call finds the existing row instead of creating another one.
  const secondResponse = await shorten();
  assert.equal(secondResponse.status, 200);
  const second = await secondResponse.json();

  assert.equal(second.short_code, first.short_code);
  assert.equal(second.original_url, randomUrl);
});
