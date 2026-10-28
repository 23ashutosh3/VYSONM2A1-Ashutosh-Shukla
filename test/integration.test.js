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
const { findByCode } = await import('../src/models/url.sequelize.model.js');

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

// Q8: a code that was never issued should be a 404, not a redirect or a 500.
test('redirecting with a short code that does not exist returns 404', async () => {
  // Codes are 8 alphanumeric characters, so one with a hyphen can never
  // have been generated and is guaranteed to be missing.
  const missingCode = 'no-such-';

  const response = await fetch(`${baseUrl}/redirect?code=${missingCode}`, {
    redirect: 'manual',
  });

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('location'), null);

  const body = await response.json();
  assert.equal(body.error, `No URL found for code "${missingCode}"`);
});

// Q9: DELETE /shorten/:code removes a code so it no longer redirects.
test('deleting a short code removes it', async () => {
  const url = `https://example.com/${randomBytes(8).toString('hex')}`;

  const shortenResponse = await fetch(`${baseUrl}/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  assert.equal(shortenResponse.status, 201);
  const { short_code: shortCode } = await shortenResponse.json();

  // 1. Delete it: 204 with an empty body.
  const deleteResponse = await fetch(`${baseUrl}/shorten/${shortCode}`, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 204);
  assert.equal(await deleteResponse.text(), '');

  // 2. The code no longer redirects.
  const redirectResponse = await fetch(`${baseUrl}/redirect?code=${shortCode}`, {
    redirect: 'manual',
  });
  assert.equal(redirectResponse.status, 404);

  // 3. Shortening the same URL again creates a fresh row instead of
  //    returning the deleted one.
  const reshortenResponse = await fetch(`${baseUrl}/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  assert.equal(reshortenResponse.status, 201);
});

test('deleting a short code that does not exist returns 404', async () => {
  const missingCode = 'no-such-';

  const response = await fetch(`${baseUrl}/shorten/${missingCode}`, { method: 'DELETE' });

  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error, `No URL found for code "${missingCode}"`);
});

// Q10: further edge cases.

function postShorten(body) {
  return fetch(`${baseUrl}/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function randomUrl() {
  return `https://example.com/${randomBytes(8).toString('hex')}`;
}

test('shortening without a url returns 400', async () => {
  for (const body of [{}, { url: '' }, { url: '   ' }, { url: 123 }]) {
    const response = await postShorten(body);
    assert.equal(response.status, 400, `body ${JSON.stringify(body)}`);
    assert.equal((await response.json()).error, '"url" is required');
  }
});

test('shortening with url null returns 400', async () => {
  const response = await postShorten({ url: null });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, '"url" is required');
});

test('shortening a non-http(s) URL returns 400', async () => {
  // javascript: and data: would run script in the visitor's browser on redirect.
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com']) {
    const response = await postShorten({ url });
    assert.equal(response.status, 400, url);
    assert.equal((await response.json()).error, 'Only http and https URLs can be shortened');
  }
});

test('different URLs get different short codes', async () => {
  const first = await (await postShorten({ url: randomUrl() })).json();
  const second = await (await postShorten({ url: randomUrl() })).json();

  assert.notEqual(first.short_code, second.short_code);
});

// M2A2 Q3: every /redirect call adds 1 to click_count and sets last_accessed_at.
test('redirecting counts clicks and saves the last access time', async () => {
  const { short_code: shortCode } = await (await postShorten({ url: randomUrl() })).json();

  // 1. A new code has no clicks and has never been accessed.
  let row = await findByCode(shortCode);
  assert.equal(row.click_count, 0);
  assert.equal(row.last_accessed_at, null);

  // 2. Redirect 3 times.
  for (let i = 0; i < 3; i += 1) {
    await fetch(`${baseUrl}/redirect?code=${shortCode}`, { redirect: 'manual' });
  }

  // 3. The counter is 3 and the access time is filled in.
  row = await findByCode(shortCode);
  assert.equal(row.click_count, 3);
  assert.match(row.last_accessed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});
