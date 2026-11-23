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
  // Its own far-future post, so the test can't expire the way a fixed date would.
  const later = await store.createPost({ title: 'Not out yet', status: 'Published', date: '2999-01-01', category: 'Faith' });
  assert.equal(later.status, 'Scheduled');
  const list = await (await get('/stories')).text();
  assert.doesNotMatch(list, /Not out yet/);
  assert.doesNotMatch(list, /Grief doesn/); // draft
  assert.equal((await get(`/stories/${later.slug}`)).status, 404);
  assert.equal((await get('/stories/grief-doesnt-keep-to-a-timetable')).status, 404);
  await store.deletePost(later.id);
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

test('heading line breaks keep a space, since phones hide them', async () => {
  for (const p of ['/', '/about', '/philanthropy', '/stories', '/contact']) {
    const page = await (await get(p)).text();
    for (const [h] of page.matchAll(/<h[12][^>]*>[\s\S]*?<\/h[12]>/g)) {
      assert.doesNotMatch(h, /[^\s>]<br>/, `${p}: ${h}`);
    }
  }
});

test('home hero is a slideshow with the new photo', async () => {
  const page = await (await get('/')).text();
  assert.match(page, /data-slider/);
  assert.match(page, /\/images\/gym-training\.jpg/);
  assert.equal((page.match(/class="slider-dot"/g) || []).length, 2);
  assert.doesNotMatch(page, /gym-cable-row/);
});

test('social links show in the footer and on the contact page', async () => {
  const want = [
    'https://www.instagram.com/leya_mnangagwa/',
    'https://www.tiktok.com/@leyamnangagwaofficial',
    'https://www.facebook.com/61582356747996/',
    'https://www.linkedin.com/in/leya-mnangagwa-232256389/',
  ];
  const contact = await (await get('/contact')).text();
  const footer = (await (await get('/about')).text()).split('<footer')[1];
  for (const url of want) {
    assert.equal(contact.split(`href="${url}"`).length - 1, 2, `contact page + its footer: ${url}`);
    assert.ok(footer.includes(`href="${url}" target="_blank" rel="noopener"`), `footer: ${url}`);
  }
  assert.doesNotMatch(contact, /aria-label="[^"]*YouTube/, 'no YouTube icon without a link');
  assert.doesNotMatch(contact, /class="socials[^"]*">\s*<a href="#"/, 'no dead social links');
});

test('no stats sections until real figures are ready', async () => {
  assert.doesNotMatch(await (await get('/')).text(), /people supported|class="supported"/);
  assert.doesNotMatch(await (await get('/philanthropy')).text(), /class="impact|Women reached|Podcast episodes/);
});

test('article byline has no role, and Leya\'s posts carry her bio', async () => {
  const page = await (await get('/stories/five-small-habits-that-take-the-edge-off-a-racing-mind')).text();
  const byline = page.match(/<div class="byline">[\s\S]*?<\/div>/)[0];
  assert.doesNotMatch(byline, /\[Role\]|<small>/);
  assert.match(page, /<strong>Leya Mnangagwa<\/strong>/);
  assert.match(page, /Leya Mnangagwa is a faith-led entrepreneur, wellness advocate, philanthropist, former model, and the CEO and founder of Arimah Travel and Tours\./);

  const guest = await store.createPost({ title: 'Guest voice', author: 'Jane Guest', status: 'Published', category: 'Faith', body: 'Hello' });
  const gp = await (await get(`/stories/${guest.slug}`)).text();
  assert.match(gp, /<strong>Jane Guest<\/strong>/);
  assert.doesNotMatch(gp, /faith-led entrepreneur/, 'no Leya bio under another author');
  await store.deletePost(guest.id);
});
