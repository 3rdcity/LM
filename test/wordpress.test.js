import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lm-wp-test-'));
process.env.DATA_DIR = dir;
process.env.ADMIN_PASSWORD = 'pw-for-tests';
process.env.SESSION_SECRET = 'test-secret';

const { app } = await import('../server.js');
const wp = await import('../src/wordpress.js');

// A stand-in WordPress site: one page of posts and one image.
const jpg = fs.readFileSync(new URL('../images/wwl-card.jpg', import.meta.url));
let wpBase;
const wpServer = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/wp-json/wp/v2/posts') {
    res.writeHead(200, { 'content-type': 'application/json', 'x-wp-total': '1', 'x-wp-totalpages': '1' });
    return res.end(JSON.stringify([{
      id: 7, date: '2025-02-03T10:00:00', slug: 'from-wordpress', status: 'publish', link: `${wpBase}/from-wordpress/`,
      title: { rendered: 'Hello &#8220;WordPress&#8221;' },
      content: { rendered: `<p>Imported <em>body</em>.</p><figure><img src="${wpBase}/pic.jpg" alt="Pic"><figcaption>Cap</figcaption></figure>` },
      excerpt: { rendered: '<p>The excerpt [&hellip;]</p>' },
      _embedded: { author: [{ name: 'Leya' }], 'wp:term': [[{ taxonomy: 'category', name: 'Mindfulness' }]] },
    }]));
  }
  if (u.pathname === '/pic.jpg') {
    res.writeHead(200, { 'content-type': 'image/jpeg' });
    return res.end(jpg);
  }
  res.writeHead(404).end();
});

let server, base;
before(async () => {
  await new Promise((r) => wpServer.listen(0, '127.0.0.1', r));
  wpBase = `http://127.0.0.1:${wpServer.address().port}`;
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  wpServer.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function login() {
  const res = await fetch(base + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'pw-for-tests' }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const page = await (await fetch(base + '/admin/import', { headers: { cookie } })).text();
  return { cookie, csrf: page.match(/name="csrf-token" content="([^"]+)"/)[1] };
}

test('block-editor HTML becomes clean Markdown', () => {
  const md = wp.htmlToMarkdown(`<!-- wp:paragraph --><p>Hi <strong>there</strong> &amp; welcome.</p><!-- /wp:paragraph -->
    <h1>Big</h1>
    <figure class="wp-block-image"><a href="https://x.test/full.jpg"><img src="https://x.test/a.jpg" alt="A [cat]"></a><figcaption>Our "cat"</figcaption></figure>
    <iframe src="https://www.youtube.com/embed/xyz"></iframe><script>alert(1)</script>`);
  assert.match(md, /^Hi \*\*there\*\* & welcome\./);
  assert.match(md, /^## Big$/m);
  assert.match(md, /!\[A cat\]\(https:\/\/x\.test\/a\.jpg "Our “cat”"\)/);
  assert.match(md, /\[Watch the video\]\(https:\/\/www\.youtube\.com\/embed\/xyz\)/);
  assert.doesNotMatch(md, /alert|wp:paragraph/);
});

test('classic-editor posts keep their paragraphs and captions', () => {
  const md = wp.htmlToMarkdown('Line one\nline two\n\nSecond\n\n[caption id="a"]<img src="/p.jpg" alt="P"> The caption[/caption]\n\nEnd [gallery ids="1"]');
  assert.match(md, /^Line one {2}\nline two\n\nSecond\n\n!\[P\]\(\/p\.jpg "The caption"\)\n\nEnd$/);
});

test('excerpts drop WordPress endings and fit the 180 limit', () => {
  assert.equal(wp.makeExcerpt('<p>Short one &hellip; [&hellip;]</p>', ''), 'Short one …');
  const long = wp.makeExcerpt('', `<p>${'word '.repeat(80)}</p>`);
  assert.ok(long.length <= 180 && long.endsWith('…'));
});

test('categories map to this site, with a fallback', () => {
  assert.equal(wp.mapCategory(['Uncategorized', 'faith'], 'Family'), 'Faith');
  assert.equal(wp.mapCategory(['News'], 'Family'), 'Family');
});

test('private network addresses are refused', async () => {
  delete process.env.IMPORT_ALLOW_PRIVATE;
  for (const url of ['http://127.0.0.1:1', 'http://localhost', 'http://169.254.169.254', 'http://10.0.0.5']) {
    await assert.rejects(wp.fetchSitePage(url), wp.ImportError, url);
  }
});

test('imports a post from a WordPress site through the admin API', async () => {
  process.env.IMPORT_ALLOW_PRIVATE = '1'; // the stand-in site runs on localhost
  const { cookie, csrf } = await login();
  const headers = { cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' };

  assert.equal((await fetch(`${base}/admin/api/import/site?url=${encodeURIComponent(wpBase)}`)).status, 401, 'needs login');
  const found = await (await fetch(`${base}/admin/api/import/site?url=${encodeURIComponent(wpBase)}`, { headers })).json();
  assert.equal(found.posts.length, 1);
  assert.equal(found.posts[0].title, 'Hello “WordPress”');

  const importOne = async () => (await fetch(`${base}/admin/api/import/post`, {
    method: 'POST', headers, body: JSON.stringify({ post: found.posts[0], options: { asDrafts: false, defaultCategory: 'Family' } }),
  })).json();
  const r = await importOne();
  assert.equal(r.status, 'imported', JSON.stringify(r));
  assert.equal(r.postStatus, 'Published');

  const page = await (await fetch(`${base}/stories/from-wordpress`)).text();
  assert.match(page, /Hello “WordPress”/);
  assert.match(page, /<em>body<\/em>/);
  assert.match(page, /<img src="\/uploads\/[^"]+\.jpg" alt="Pic"[^>]*><figcaption>Cap<\/figcaption>/);
  assert.match(page, /Mindfulness/);

  assert.equal((await importOne()).status, 'skipped', 'running it again skips the copy');
});
