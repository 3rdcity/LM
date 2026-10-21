import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolated data dir and admin password, set before the app loads.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lm-test-'));
process.env.DATA_DIR = dir;
process.env.ADMIN_PASSWORD = 'pw-for-tests';
process.env.SESSION_SECRET = 'test-secret';

const { app } = await import('../server.js');
const store = await import('../src/store.js');

let server, base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const get = (p, opts) => fetch(base + p, { redirect: 'manual', ...opts });
const post = (p, form, opts = {}) =>
  fetch(base + p, { method: 'POST', redirect: 'manual', body: new URLSearchParams(form), ...opts });

async function login() {
  const res = await post('/admin/login', { password: 'pw-for-tests' });
  assert.equal(res.status, 303);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const page = await (await get('/admin', { headers: { cookie } })).text();
  const csrf = page.match(/name="csrf-token" content="([^"]+)"/)[1];
  return { cookie, csrf };
}

test('public pages render', async () => {
  for (const p of ['/', '/about', '/stories', '/philanthropy', '/contact', '/terms', '/privacy', '/sitemap.xml']) {
    assert.equal((await get(p)).status, 200, p);
  }
  assert.equal((await get('/no-such-page')).status, 404);
});

test('no old brand name anywhere on the site', async () => {
  for (const p of ['/', '/about', '/stories', '/stories/five-small-habits-that-take-the-edge-off-a-racing-mind']) {
    assert.doesNotMatch(await (await get(p)).text(), /Stillwell/i, p);
  }
});

test('drafts and future scheduled posts stay private', async () => {
  const list = await (await get('/stories')).text();
  assert.doesNotMatch(list, /Learning to pause/); // scheduled for later
  assert.doesNotMatch(list, /Grief doesn/); // draft
  assert.equal((await get('/stories/learning-to-pause-before-you-react')).status, 404);
});

test('scheduled posts go live on their date', () => {
  const p = { status: 'Scheduled', date: '2026-10-28' };
  assert.equal(store.isLive(p, '2026-10-27'), false);
  assert.equal(store.isLive(p, '2026-10-28'), true);
});

test('publishing with a future date schedules the post', () => {
  const p = store.normalizePost({ title: 'x', status: 'Published', date: '2999-01-01' });
  assert.equal(p.status, 'Scheduled');
  const q = store.normalizePost({ title: 'x', status: 'Published' });
  assert.equal(q.status, 'Published');
  assert.equal(q.date, store.today());
});

test('excerpt is capped at 180 characters', () => {
  assert.equal(store.normalizePost({ excerpt: 'a'.repeat(300) }).excerpt.length, 180);
});

test('topic filter only shows that category', async () => {
  const html = await (await get('/stories?topic=Relationships')).text();
  assert.match(html, /How to argue/);
  assert.doesNotMatch(html, /Five small habits/);
});

test('contact form validates, saves and offers newsletter opt-in', async () => {
  const bad = await post('/contact', { name: '', email: 'nope', message: '' });
  assert.equal(bad.status, 422);

  const ok = await post('/contact', { name: 'Ada', email: 'ada@example.com', topic: 'Mentorship', message: 'Hi', newsletter: '1' });
  assert.equal(ok.status, 303);
  assert.match(ok.headers.get('location'), /sent=1/);
  assert.equal((await store.allMessages())[0].name, 'Ada');
  assert.ok((await store.allSubscribers()).some((s) => s.email === 'ada@example.com'));
});

test('newsletter rejects open redirects and duplicates', async () => {
  const r1 = await post('/subscribe', { email: 'news@example.com', back: '//evil.example' });
  assert.equal(r1.headers.get('location'), '/?nl=ok#newsletter');
  const r2 = await post('/subscribe', { email: 'NEWS@example.com', back: '/about' });
  assert.equal(r2.headers.get('location'), '/about?nl=exists#newsletter');
});

test('admin needs a password and a CSRF token', async () => {
  assert.equal((await post('/admin/login', { password: 'wrong' })).status, 401);
  assert.equal((await get('/admin/api/posts')).status, 401);

  const { cookie, csrf } = await login();
  const json = { cookie, 'Content-Type': 'application/json' };
  const noToken = await fetch(base + '/admin/api/posts', { method: 'POST', headers: json, body: '{}' });
  assert.equal(noToken.status, 403);

  const created = await fetch(base + '/admin/api/posts', {
    method: 'POST',
    headers: { ...json, 'X-CSRF-Token': csrf },
    body: JSON.stringify({ title: 'Hello <world>', body: 'Hi <script>x()</script> **hi**', status: 'Published' }),
  });
  assert.equal(created.status, 201);
  const { post: p } = await created.json();
  assert.equal(p.slug, 'hello-world');

  const page = await (await get('/stories/hello-world')).text();
  assert.doesNotMatch(page, /<script>x\(\)/);
  assert.match(page, /&lt;script&gt;/);
  assert.match(page, /<strong>hi<\/strong>/);
});

test('uploads only accept real images', async () => {
  const { cookie, csrf } = await login();
  const headers = { cookie, 'X-CSRF-Token': csrf };
  const fake = await fetch(base + '/admin/api/upload', { method: 'POST', headers: { ...headers, 'Content-Type': 'image/png' }, body: 'not an image' });
  assert.equal(fake.status, 415);
  const jpg = fs.readFileSync(new URL('../images/wwl-card.jpg', import.meta.url));
  const real = await fetch(base + '/admin/api/upload', { method: 'POST', headers: { ...headers, 'Content-Type': 'image/jpeg' }, body: jpg });
  assert.equal(real.status, 201);
  const { url } = await real.json();
  assert.equal((await get(url)).status, 200);
});
