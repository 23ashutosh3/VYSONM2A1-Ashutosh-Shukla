import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point the app at a throwaway database before it is imported, so tests
// never touch the committed data/url_shortener.db file.
const dir = mkdtempSync(join(tmpdir(), 'url-shortener-test-'));
process.env.DATABASE_PATH = join(dir, 'test.db');

const { default: app } = await import('../src/app.js');
const { db } = await import('../src/db.js');

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = (url) =>
  fetch(`${base}/shorten`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

describe('POST /shorten', () => {
  it('returns 201 and a short code for a new URL', async () => {
    const res = await post('https://example.com/one');
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.equal(body.original_url, 'https://example.com/one');
    assert.match(body.short_code, /^[A-Za-z0-9]{8}$/);
    assert.ok(body.short_url.endsWith(`/redirect?code=${body.short_code}`));
  });

  it('is idempotent: the same URL keeps its original code', async () => {
    const first = await (await post('https://example.com/two')).json();
    const again = await post('https://example.com/two');

    assert.equal(again.status, 200);
    assert.equal((await again.json()).short_code, first.short_code);
  });

  it('rejects a missing url', async () => {
    const res = await fetch(`${base}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(res.status, 400);
  });

  it('rejects a malformed url', async () => {
    assert.equal((await post('not a url')).status, 400);
  });

  it('rejects non-http schemes', async () => {
    assert.equal((await post('javascript:alert(1)')).status, 400);
    assert.equal((await post('data:text/html,<script>')).status, 400);
  });
});

describe('GET /redirect', () => {
  it('redirects to the original URL', async () => {
    const { short_code: code } = await (await post('https://example.com/three')).json();

    const res = await fetch(`${base}/redirect?code=${code}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), 'https://example.com/three');
  });

  it('counts each visit', async () => {
    const { short_code: code } = await (await post('https://example.com/four')).json();

    await fetch(`${base}/redirect?code=${code}`, { redirect: 'manual' });
    await fetch(`${base}/redirect?code=${code}`, { redirect: 'manual' });

    const { visit_count: visits } = db
      .prepare('SELECT visit_count FROM url_shortner WHERE short_code = ?')
      .get(code);
    assert.equal(visits, 2);
  });

  it('returns 404 for an unknown code', async () => {
    const res = await fetch(`${base}/redirect?code=nope1234`, { redirect: 'manual' });
    assert.equal(res.status, 404);
  });

  it('returns 400 when code is missing', async () => {
    const res = await fetch(`${base}/redirect`, { redirect: 'manual' });
    assert.equal(res.status, 400);
  });
});

describe('unknown routes', () => {
  it('returns 404 with a JSON error', async () => {
    const res = await fetch(`${base}/nope`);
    assert.equal(res.status, 404);
    assert.ok((await res.json()).error);
  });
});
