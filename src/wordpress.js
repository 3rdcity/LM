// Imports posts from WordPress, either live from a site's public REST API or
// from a WordPress export file (parsed in the browser, then sent here one
// post at a time). WordPress HTML becomes this site's Markdown, and images
// are copied into this site's storage so they outlive the old site.
import dns from 'node:dns/promises';
import net from 'node:net';
import TurndownService from 'turndown';
import domino from '@mixmark-io/domino';
import * as store from './store.js';
import { site } from './site.js';
import { sniffImage, newUploadName } from './images.js';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // served back through a Netlify Function, which caps responses at 6MB
const POST_BUDGET_MS = 7000; // Netlify Functions stop at 10s, so leave room to save the post
const PER_PAGE = 20;

// ------------------------------------------------------------------ Safe fetching

export class ImportError extends Error {}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

// The admin can point the importer at any address, so refuse ones that lead
// into private networks (cloud metadata services and the like).
async function assertPublicUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ImportError('That doesn’t look like a web address.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new ImportError('Only http and https addresses work.');
  if (process.env.IMPORT_ALLOW_PRIVATE === '1') return url;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) throw new ImportError('That address isn’t a public website.');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => {
    throw new ImportError(`Couldn’t find ${host}. Check the address for typos.`);
  });
  if (addrs.some((a) => isPrivateIp(a.address))) throw new ImportError('That address isn’t a public website.');
  return url;
}

// fetch() that re-checks every redirect hop and gives up after a timeout.
async function safeFetch(raw, { timeout = 8000, accept } = {}) {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': 'LeyaM-Importer/1.0 (+WordPress import)', ...(accept ? { Accept: accept } : {}) },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), url).href;
      continue;
    }
    return res;
  }
  throw new ImportError('Too many redirects.');
}

// ------------------------------------------------------------------ Text helpers

export function textOf(html) {
  if (!html) return '';
  const doc = domino.createDocument(`<!doctype html><body>${html}</body>`);
  return doc.body.textContent.replace(/\s+/g, ' ').trim();
}

// WordPress excerpts end in "[…]" or "Continue reading". Cards need 180 chars at most.
export function makeExcerpt(excerptHtml, bodyHtml) {
  let t = textOf(excerptHtml)
    .replace(/\s*(\[(…|&hellip;|\.\.\.)\]|Continue reading.*|Read more.*)$/i, '')
    .trim();
  if (!t) t = textOf(bodyHtml);
  if (t.length <= store.EXCERPT_MAX) return t;
  const cut = t.slice(0, store.EXCERPT_MAX - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 120)).replace(/[\s,;:.–—-]+$/, '') + '…';
}

// Picks the first WordPress category that matches one of this site's.
export function mapCategory(names = [], fallback) {
  const ours = new Map(site.categories.map((c) => [c.toLowerCase(), c]));
  for (const n of names) {
    const hit = ours.get(String(n).trim().toLowerCase());
    if (hit) return hit;
  }
  return site.categories.includes(fallback) ? fallback : site.categories[0];
}

// ------------------------------------------------------------------ HTML to Markdown

const BLOCK = /^<(p|div|h[1-6]|ul|ol|li|blockquote|figure|table|pre|hr|section|article|iframe|img|\[caption)/i;

// Classic-editor posts store paragraphs as blank lines, not <p> tags.
function autop(html) {
  if (/<p[\s>]/i.test(html)) return html;
  return html
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => (BLOCK.test(block) ? block : `<p>${block.replace(/\n/g, '<br>\n')}</p>`))
    .join('\n');
}

function expandShortcodes(html) {
  return html
    // [caption]<img> Caption text[/caption] → a captioned figure
    .replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_, inner) => {
      const m = inner.match(/^([\s\S]*<img[^>]*>(?:\s*<\/a>)?)([\s\S]*)$/i);
      return m ? `<figure>${m[1]}<figcaption>${m[2].trim()}</figcaption></figure>` : inner;
    })
    .replace(/\[embed\]([\s\S]*?)\[\/embed\]/gi, (_, u) => `<p><a href="${u.trim()}">${u.trim()}</a></p>`)
    // Galleries need WordPress's media library to render; nothing to show without it.
    .replace(/\[gallery[^\]]*\]/gi, '');
}

const imgSrc = (img) => img.getAttribute('data-orig-file') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
const mdAlt = (s) => (s || '').replace(/[[\]]/g, '').trim();
// Markdown titles sit inside straight quotes, so typographic ones go inside.
const mdTitle = (s) => (s ? ` "${s.replace(/"([^"]*)"/g, '“$1”').replace(/"/g, '”').replace(/\s+/g, ' ').trim()}"` : '');
const imageMd = (img, caption) => {
  const src = imgSrc(img);
  return src ? `![${mdAlt(img.getAttribute('alt'))}](${src.replace(/ /g, '%20')}${mdTitle(caption)})` : '';
};

// Domino's node lists aren't iterable, so copy them into arrays.
const byTag = (node, tag) => Array.from(node.getElementsByTagName(tag));

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', hr: '---' });
turndown.remove(['script', 'style', 'noscript', 'form', 'button', 'input', 'select', 'textarea']);
// The post title is the page's h1, so headings inside the body start at h2.
turndown.addRule('h1', { filter: 'h1', replacement: (content) => `\n\n## ${content.trim()}\n\n` });
turndown.addRule('figure', {
  filter: 'figure',
  replacement(content, node) {
    if (byTag(node, 'figure').length) return `\n\n${content}\n\n`; // gallery of figures: each converts itself
    const imgs = byTag(node, 'img');
    if (!imgs.length) return `\n\n${content.trim()}\n\n`;
    const cap = byTag(node, 'figcaption')[0]?.textContent;
    return '\n\n' + imgs.map((img, i) => imageMd(img, imgs.length === 1 ? cap : i === 0 ? cap : '')).filter(Boolean).join('\n\n') + '\n\n';
  },
});
turndown.addRule('img', { filter: 'img', replacement: (_, node) => imageMd(node) });
// A link wrapping only an image (WordPress's "link to media file") becomes just the image.
turndown.addRule('imageLink', {
  filter: (node) => node.nodeName === 'A' && byTag(node, 'img').length > 0 && !node.textContent.trim(),
  replacement: (content) => content,
});
turndown.addRule('iframe', {
  filter: 'iframe',
  replacement(_, node) {
    const src = node.getAttribute('src') || '';
    if (!/^https?:/i.test(src)) return '';
    const label = /youtube|youtu\.be|vimeo/i.test(src) ? 'Watch the video' : 'Open the embedded content';
    return `\n\n[${label}](${src})\n\n`;
  },
});

export function htmlToMarkdown(html) {
  if (!html) return '';
  const prepared = autop(expandShortcodes(html.replace(/<!--[\s\S]*?-->/g, '')));
  return turndown.turndown(prepared).replace(/\n{3,}/g, '\n\n').trim();
}

// ------------------------------------------------------------------ Reading a WordPress site

function siteBase(input) {
  let s = String(input || '').trim();
  if (!s) throw new ImportError('Enter your WordPress site’s address.');
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let url;
  try {
    url = new URL(s);
  } catch {
    throw new ImportError('That doesn’t look like a web address.');
  }
  // People paste admin or post links; the site root is what's needed.
  const path = url.pathname.replace(/\/(wp-admin|wp-login\.php|wp-json)(\/.*)?$/, '').replace(/\/+$/, '');
  return { origin: url.origin, path, host: url.hostname };
}

// The REST API lives in different places depending on the site's settings.
function endpointsFor(base) {
  const list = [];
  const a = new URL(`${base.origin}${base.path}/wp-json/wp/v2/posts`);
  list.push(a.href);
  const b = new URL(`${base.origin}${base.path}/`);
  b.searchParams.set('rest_route', '/wp/v2/posts');
  list.push(b.href);
  list.push(`https://public-api.wordpress.com/wp/v2/sites/${base.host}/posts`);
  return list;
}

function withQuery(endpoint, page) {
  const u = new URL(endpoint);
  u.searchParams.set('per_page', String(PER_PAGE));
  u.searchParams.set('page', String(page));
  u.searchParams.set('_embed', '1');
  return u.href;
}

const looksLikeWpPosts = (data) => Array.isArray(data) && data.every((p) => p && typeof p.id === 'number' && p.title && 'rendered' in p.title);

function fromRest(p) {
  const embedded = p._embedded || {};
  const media = embedded['wp:featuredmedia']?.[0];
  return {
    sourceId: p.id,
    link: p.link || '',
    title: textOf(p.title?.rendered),
    slug: p.slug || '',
    date: (p.date || '').slice(0, 10),
    status: p.status || 'publish',
    author: embedded.author?.[0]?.name || '',
    categories: (embedded['wp:term'] || []).flat().filter((t) => t && t.taxonomy === 'category').map((t) => textOf(t.name)),
    html: p.content?.rendered || '',
    excerptHtml: p.excerpt?.rendered || '',
    featuredImage: media?.source_url ? { url: media.source_url, alt: media.alt_text || '' } : null,
    protected: !!p.content?.protected,
  };
}

// One page of posts. The first call probes for the API; later calls reuse
// the endpoint it found.
export async function fetchSitePage(siteInput, page = 1, knownEndpoint) {
  const base = siteBase(siteInput);
  const candidates = knownEndpoint ? [knownEndpoint] : endpointsFor(base);
  let lastError;
  for (const endpoint of candidates) {
    try {
      // The known endpoint must still point at the site the admin typed in.
      if (knownEndpoint && !endpointsFor(base).includes(knownEndpoint)) throw new ImportError('Unexpected endpoint.');
      const res = await safeFetch(withQuery(endpoint, page), { accept: 'application/json' });
      if (res.status === 400 && page > 1) return { posts: [], page, totalPages: page - 1, total: 0, endpoint };
      if (res.status === 401 || res.status === 403) {
        lastError = new ImportError('That site blocks its post API. Use a WordPress export file instead.');
        continue;
      }
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (!looksLikeWpPosts(data)) continue;
      return {
        posts: data.map(fromRest),
        page,
        totalPages: Number(res.headers.get('x-wp-totalpages')) || (data.length < PER_PAGE ? page : page + 1),
        total: Number(res.headers.get('x-wp-total')) || data.length,
        endpoint,
      };
    } catch (err) {
      if (err instanceof ImportError && !lastError) lastError = err;
      else if (!(err instanceof ImportError)) lastError ??= new ImportError('Couldn’t reach that site. Check the address and try again.');
    }
  }
  throw lastError || new ImportError('Couldn’t find WordPress posts at that address. Check the address, or use a WordPress export file instead.');
}

// ------------------------------------------------------------------ Images

async function copyImage(url, deadline) {
  const left = deadline - Date.now();
  if (left < 800) return { error: 'ran out of time' };
  try {
    const res = await safeFetch(url, { timeout: Math.min(6000, left), accept: 'image/*' });
    if (!res.ok) return { error: `the old site answered ${res.status}` };
    if (Number(res.headers.get('content-length')) > MAX_IMAGE_BYTES) return { error: 'too large to copy (over 4MB)' };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) return { error: 'too large to copy (over 4MB)' };
    const type = sniffImage(buf);
    if (!type) return { error: 'not a JPG, PNG, WebP or GIF' };
    const name = newUploadName(type);
    await store.saveUpload(name, buf, type);
    return { url: `/uploads/${name}` };
  } catch (err) {
    return { error: err instanceof ImportError ? err.message : 'download failed' };
  }
}

// Swaps every remote image in the post for a local copy. Images that can't be
// copied keep pointing at the old site, with a warning.
async function copyImages(md, featured, baseUrl, warnings) {
  const deadline = Date.now() + POST_BUDGET_MS;
  const abs = (u) => {
    try {
      return new URL(u, baseUrl || undefined).href;
    } catch {
      return null;
    }
  };
  const urls = new Set();
  const re = /!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/g;
  for (const m of md.matchAll(re)) if (abs(m[1])?.startsWith('http')) urls.add(abs(m[1]));
  if (featured && abs(featured)?.startsWith('http')) urls.add(abs(featured));

  const copied = new Map();
  const queue = [...urls];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const u = queue.shift();
      const r = await copyImage(u, deadline);
      if (r.url) copied.set(u, r.url);
      else warnings.push(`Kept a linked image (${r.error}): ${u}`);
    }
  }));

  const body = md.replace(re, (whole, u) => {
    const local = copied.get(abs(u));
    return local ? whole.replace(u, local) : whole.replace(u, abs(u) || u);
  });
  return { body, image: featured ? copied.get(abs(featured)) || abs(featured) || '' : '' };
}

// ------------------------------------------------------------------ Saving

const STATUS = { publish: 'Published', future: 'Published' }; // normalizePost turns a future date into Scheduled

function cleanSlug(slug, title) {
  let s = slug || '';
  try {
    s = decodeURIComponent(s);
  } catch {}
  return store.slugify(s || title);
}

// Imports one normalized WordPress post. Returns what happened, for the
// progress list in the admin.
export async function importPost(wp, { defaultCategory, asDrafts = true, copyImages: doCopy = true, skipExisting = true, siteUrl } = {}) {
  const title = String(wp.title || '').trim() || 'Untitled post';
  const slug = cleanSlug(wp.slug, title);
  const sourceUrl = String(wp.link || '').slice(0, 500);

  const existing = await store.allPosts();
  const dup = existing.find((p) => p.slug === slug || (sourceUrl && p.source?.url === sourceUrl));
  if (dup && skipExisting) return { status: 'skipped', title, reason: 'already on this site', id: dup.id, slug: dup.slug };

  const warnings = [];
  if (wp.protected) warnings.push('Password-protected on WordPress, so its text couldn’t be read.');
  let body = htmlToMarkdown(String(wp.html || ''));
  let image = wp.featuredImage?.url || '';
  const baseUrl = siteUrl || sourceUrl || undefined;
  if (doCopy) {
    ({ body, image } = await copyImages(body, image, baseUrl, warnings));
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(wp.date) && wp.date !== '0000-00-00' ? wp.date : '';
  const post = await store.createPost({
    title,
    slug,
    category: mapCategory(wp.categories, defaultCategory),
    author: String(wp.author || '').trim(),
    date,
    status: asDrafts ? 'Draft' : STATUS[wp.status] || 'Draft',
    image,
    imageAlt: String(wp.featuredImage?.alt || '').trim(),
    excerpt: makeExcerpt(wp.excerptHtml, wp.html),
    body,
  }, { source: { type: 'wordpress', url: sourceUrl, id: wp.sourceId ?? null } });

  return { status: 'imported', title, id: post.id, slug: post.slug, postStatus: post.status, warnings };
}
