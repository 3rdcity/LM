import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';

import * as store from './src/store.js';
import { site } from './src/site.js';
import { html } from './src/views/html.js';
import * as pages from './src/views/pages.js';
import * as admin from './src/views/admin.js';
import * as auth from './src/auth.js';
import { sendContactEmail, mailConfigured } from './src/mail.js';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PER_PAGE = 6;

export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : process.env.TRUST_PROXY);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

const week = { maxAge: '7d' };
app.use('/images', express.static(path.join(ROOT, 'images'), week));
app.use('/uploads', express.static(store.UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use(express.static(path.join(ROOT, 'public'), { maxAge: '1h' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

// The newsletter note only shows once, right after a sign-up redirect.
const nlState = (req) => (['ok', 'exists', 'invalid', 'error'].includes(req.query.nl) ? req.query.nl : undefined);
const send = (res, body, status = 200) => res.status(status).type('html').send(body);

// ------------------------------------------------------------------ Public
app.get('/', (req, res) => {
  send(res, pages.homePage({ latest: store.livePosts().slice(0, 3), nl: nlState(req) }));
});

app.get('/about', (req, res) => send(res, pages.aboutPage({ nl: nlState(req) })));
app.get('/philanthropy', (req, res) => send(res, pages.philanthropyPage({ nl: nlState(req) })));

app.get('/stories', (req, res) => {
  const topic = site.categories.includes(req.query.topic) ? req.query.topic : null;
  const all = store.livePosts({ category: topic });
  const pagesTotal = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(pagesTotal, Math.max(1, parseInt(req.query.page, 10) || 1));
  const posts = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  send(res, pages.journalPage({ posts, topic, page, pages: pagesTotal, nl: nlState(req) }));
});

app.get('/stories/:slug', (req, res, next) => {
  const post = store.findPostBySlug(req.params.slug);
  if (!post) return next();
  const live = store.isLive(post);
  if (!live && !auth.isAdmin(req)) return next();
  // Same category first, then the most recent, never the post itself.
  const others = store.livePosts().filter((p) => p.id !== post.id);
  const more = [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, 2);
  if (!live) res.setHeader('Cache-Control', 'no-store');
  send(res, pages.articlePage({ post, more, preview: !live, nl: nlState(req) }));
});

// Old design-file links still land somewhere sensible.
const LEGACY = { home: '/', about: '/about', journal: '/stories', article: '/stories', philanthropy: '/philanthropy', contact: '/contact', admin: '/admin' };
app.get('/:page.dc.html', (req, res, next) => (LEGACY[req.params.page] ? res.redirect(301, LEGACY[req.params.page]) : next()));
app.get('/journal', (req, res) => res.redirect(301, '/stories'));
app.get('/journal/:slug', (req, res) => res.redirect(301, `/stories/${encodeURIComponent(req.params.slug)}`));

// ------------------------------------------------------------------ Contact
app.get('/contact', (req, res) => {
  const topic = site.contactTopics.includes(req.query.topic) ? req.query.topic : '';
  send(res, pages.contactPage({ sent: req.query.sent === '1', values: { topic }, nl: nlState(req) }));
});

app.post('/contact', async (req, res) => {
  const b = req.body || {};
  const values = {
    name: String(b.name || '').trim(),
    email: String(b.email || '').trim(),
    topic: site.contactTopics.includes(b.topic) ? b.topic : site.contactTopics.at(-1),
    message: String(b.message || '').trim(),
    newsletter: b.newsletter === '1',
  };
  // Bots fill the hidden field. Pretend it worked and drop it.
  if (b.website) return res.redirect(303, '/contact?sent=1#form');

  const errors = [];
  if (!values.name) errors.push('Please add your name.');
  if (!store.isEmail(values.email)) errors.push('Please add a valid email address so I can reply.');
  if (!values.message) errors.push('Please write a short message.');
  if (values.message.length > 10000) errors.push('That message is a little long. Please keep it under 10,000 characters.');
  if (errors.length) return send(res, pages.contactPage({ errors, values }), 422);

  try {
    const m = await store.addMessage(values);
    if (values.newsletter) await store.addSubscriber(values.email, 'Contact form');
    await sendContactEmail(m);
  } catch (err) {
    console.error('Contact form failed:', err);
    return send(res, pages.contactPage({ errors: ['Sorry, your message didn’t go through. Please try again in a moment.'], values }), 500);
  }
  res.redirect(303, '/contact?sent=1#form');
});

// ------------------------------------------------------------------ Newsletter
const safeBack = (p) => (typeof p === 'string' && /^\/(?!\/)[^\s\\]*$/.test(p) ? p.split('?')[0].split('#')[0] : '/');

app.post('/subscribe', async (req, res) => {
  const b = req.body || {};
  const back = safeBack(b.back);
  const go = (state) => res.redirect(303, `${back}?nl=${state}#newsletter`);
  if (b.website) return go('ok');
  if (!store.isEmail(b.email)) return go('invalid');
  try {
    const added = await store.addSubscriber(b.email, 'Footer: ' + back);
    go(added ? 'ok' : 'exists');
  } catch (err) {
    console.error('Subscribe failed:', err);
    go('error');
  }
});

// ------------------------------------------------------------------ Legal, SEO
const legal = (title, path) => (req, res) =>
  send(res, pages.simplePage({ title, path, heading: title, nl: nlState(req), children: html`<div class="legal stack" style="gap: 16px"><p>[${title.toUpperCase()} TO COME. The client will supply this text.]</p></div>` }));
app.get('/terms', legal('Terms of use', '/terms'));
app.get('/privacy', legal('Privacy policy', '/privacy'));

app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nSitemap: ${site.url}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => {
  const urls = ['/', '/about', '/stories', '/philanthropy', '/contact', ...store.livePosts().map((p) => `/stories/${p.slug}`)];
  const body = urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

// ------------------------------------------------------------------ Admin
const adminRouter = express.Router();
adminRouter.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});
const unread = () => store.allMessages().filter((m) => !m.read).length;

adminRouter.get('/', (req, res) => {
  if (!auth.adminEnabled()) return send(res, admin.loginPage({ disabled: true }), 503);
  if (!auth.isAdmin(req)) return send(res, admin.loginPage({}));
  send(res, admin.postsPage({ csrf: auth.csrfToken(req), posts: store.allPosts(), unread: unread(), today: store.today() }));
});

adminRouter.post('/login', (req, res) => {
  if (!auth.adminEnabled()) return res.redirect(303, '/admin');
  const ip = req.ip || 'unknown';
  if (!auth.loginAllowed(ip)) return send(res, admin.loginPage({ error: 'Too many tries. Please wait 15 minutes and try again.' }), 429);
  if (!auth.checkPassword(req.body?.password)) return send(res, admin.loginPage({ error: 'That password isn’t right.' }), 401);
  auth.loginSucceeded(ip);
  auth.startSession(req, res);
  res.redirect(303, '/admin');
});

adminRouter.post('/logout', auth.requireAdmin, auth.requireCsrf, (req, res) => {
  auth.endSession(req, res);
  res.redirect(303, '/admin');
});

adminRouter.get('/messages', auth.requireAdmin, (req, res) => {
  send(res, admin.messagesPage({ csrf: auth.csrfToken(req), messages: store.allMessages(), unread: unread(), mailOn: mailConfigured() }));
});
adminRouter.post('/messages/:id/:action', auth.requireAdmin, auth.requireCsrf, async (req, res) => {
  const { id, action } = req.params;
  if (action === 'read' || action === 'unread') await store.markMessageRead(id, action === 'read');
  else if (action === 'delete') await store.deleteMessage(id);
  res.redirect(303, '/admin/messages');
});

adminRouter.get('/subscribers', auth.requireAdmin, (req, res) => {
  send(res, admin.subscribersPage({ csrf: auth.csrfToken(req), subscribers: store.allSubscribers(), unread: unread() }));
});
adminRouter.post('/subscribers/delete', auth.requireAdmin, auth.requireCsrf, async (req, res) => {
  await store.deleteSubscriber(String(req.body?.email || ''));
  res.redirect(303, '/admin/subscribers');
});
adminRouter.get('/subscribers.csv', auth.requireAdmin, (req, res) => {
  // Quote every cell and neutralise leading =+-@ so spreadsheets don't run formulas.
  const cell = (v) => `"${String(v ?? '').replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"`;
  const rows = [['email', 'source', 'subscribed_at'], ...store.allSubscribers().map((s) => [s.email, s.source, s.subscribedAt])];
  res.setHeader('Content-Disposition', `attachment; filename="subscribers-${store.today()}.csv"`);
  res.type('text/csv').send(rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n');
});

// JSON API for the post editor
const apiRouter = express.Router();
apiRouter.use(auth.requireAdmin);
apiRouter.use(express.json({ limit: '1mb' }));
apiRouter.use((req, res, next) => (req.method === 'GET' ? next() : auth.requireCsrf(req, res, next)));

apiRouter.get('/posts', (req, res) => res.json({ posts: store.allPosts() }));
apiRouter.post('/posts', async (req, res) => res.status(201).json({ post: await store.createPost(req.body || {}) }));
apiRouter.put('/posts/:id', async (req, res) => {
  const post = await store.updatePost(Number(req.params.id), req.body || {});
  if (!post) return res.status(404).json({ error: 'That post no longer exists.' });
  res.json({ post });
});
apiRouter.delete('/posts/:id', async (req, res) => {
  if (!(await store.deletePost(Number(req.params.id)))) return res.status(404).json({ error: 'That post no longer exists.' });
  res.json({ ok: true });
});

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
// Checks the file's first bytes too, so a renamed file can't pose as an image.
const looksLikeImage = (buf, type) =>
  (type === 'image/jpeg' && buf[0] === 0xff && buf[1] === 0xd8) ||
  (type === 'image/png' && buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) ||
  (type === 'image/webp' && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP');

apiRouter.post('/upload', express.raw({ type: Object.keys(IMAGE_TYPES), limit: '8mb' }), async (req, res) => {
  const type = req.get('content-type');
  const ext = IMAGE_TYPES[type];
  if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(415).json({ error: 'Please upload a JPG, PNG or WebP image.' });
  if (!looksLikeImage(req.body, type)) return res.status(415).json({ error: 'That file doesn’t look like a valid image.' });
  const name = `${store.today()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  await fs.promises.writeFile(path.join(store.UPLOAD_DIR, name), req.body);
  res.status(201).json({ url: `/uploads/${name}` });
});

apiRouter.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That file is too large. The limit is 8MB.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

adminRouter.use('/api', apiRouter);
app.use('/admin', adminRouter);

// ------------------------------------------------------------------ 404 / errors
app.use((req, res) => {
  send(res, pages.simplePage({
    title: 'Page not found',
    path: req.path,
    heading: html`This page has <em class="s">wandered off</em>`,
    status: 404,
    children: html`<p class="lede">The link may be old or mistyped. Try the home page or the latest stories.</p>
      <div class="btn-row"><a class="btn btn-primary" href="/">Go home</a><a class="btn btn-outline" href="/stories">Read the stories</a></div>`,
  }), 404);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status && err.status < 500 ? err.status : 500).type('text/plain').send('Something went wrong. Please try again.');
});

// ------------------------------------------------------------------ Start
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Leya.M site running at http://localhost:${port}`);
    if (!auth.adminEnabled()) console.log('  Admin is off. Set ADMIN_PASSWORD to turn it on.');
    else if (auth.sessionSecretIsEphemeral) console.log('  SESSION_SECRET is not set, so admin logins reset on every restart.');
    if (!mailConfigured()) console.log('  Email is off. Contact messages are saved to the admin inbox only.');
  });
}
