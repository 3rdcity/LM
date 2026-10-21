import crypto from 'node:crypto';
import { backend } from './storage.js';
import seedPosts from '../seed/posts.json' with { type: 'json' };

export const STATUSES = ['Draft', 'Scheduled', 'Published'];
export const EXCERPT_MAX = 180;

export const today = () => new Date().toISOString().slice(0, 10);

export function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'untitled-post';
}

export function wordCount(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

export const readMinutes = (text) => Math.max(1, Math.round(wordCount(text) / 220));

// A scheduled post goes live on its publish date without anyone touching it.
export function isLive(p, on = today()) {
  if (p.status === 'Published') return true;
  return p.status === 'Scheduled' && !!p.date && p.date <= on;
}

const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id;
const str = (v, max = 100000) => (typeof v === 'string' ? v : '').slice(0, max);

// ------------------------------------------------------------------ Posts

// The sample posts load once, the first time the site runs. A marker
// remembers that, so deleting every post never brings the samples back.
let seeding;
function ensureSeeded() {
  seeding ??= (async () => {
    const db = backend();
    if (await db.get('meta', 'seeded')) return;
    if ((await db.list('posts')).length === 0) {
      await Promise.all(seedPosts.map((p) => db.set('posts', String(p.id), p)));
    }
    await db.set('meta', 'seeded', { at: new Date().toISOString() });
  })().catch((err) => {
    seeding = undefined;
    throw err;
  });
  return seeding;
}

async function posts() {
  await ensureSeeded();
  return backend().list('posts');
}

export async function livePosts({ category } = {}) {
  return (await posts())
    .filter((p) => isLive(p) && (!category || p.category === category))
    .sort(byDateDesc);
}

export async function allPosts() {
  return (await posts()).sort((a, b) => {
    // Drafts with no date float to the top, like the admin design.
    if (!a.date !== !b.date) return a.date ? 1 : -1;
    return byDateDesc(a, b);
  });
}

export async function findPostBySlug(slug) {
  return (await posts()).find((p) => p.slug === slug) || null;
}

function uniqueSlug(all, base, id) {
  let slug = base;
  for (let n = 2; all.some((p) => p.slug === slug && p.id !== id); n++) slug = `${base}-${n}`;
  return slug;
}

// Cleans whatever the admin editor sent into a valid post. Publishing with a
// future date becomes Scheduled, and a published post with no date gets today.
export function normalizePost(input, existing = {}) {
  const p = { ...existing };
  if ('title' in input) p.title = str(input.title, 300).replace(/\s*\n\s*/g, ' ').trim();
  if ('category' in input) p.category = str(input.category, 60).trim();
  if ('author' in input) p.author = str(input.author, 120).trim();
  if ('image' in input) p.image = str(input.image, 500).trim();
  if ('imageAlt' in input) p.imageAlt = str(input.imageAlt, 300).trim();
  if ('excerpt' in input) p.excerpt = str(input.excerpt, EXCERPT_MAX);
  if ('body' in input) p.body = str(input.body);
  if ('date' in input) p.date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : '';
  if ('status' in input && STATUSES.includes(input.status)) p.status = input.status;

  p.title ??= '';
  p.category ||= 'Anxiety';
  p.author ??= '';
  p.image ??= '';
  p.imageAlt ??= '';
  p.excerpt ??= '';
  p.body ??= '';
  p.date ??= '';
  p.status ||= 'Draft';

  if (p.status !== 'Draft') {
    if (!p.date) p.date = today();
    p.status = p.date > today() ? 'Scheduled' : 'Published';
  }
  return p;
}

export async function createPost(input) {
  const all = await posts();
  const id = all.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  const p = normalizePost(input);
  p.id = id;
  p.slug = uniqueSlug(all, slugify(input.slug || p.title), id);
  p.createdAt = p.updatedAt = new Date().toISOString();
  await backend().set('posts', String(id), p);
  return p;
}

export async function updatePost(id, input) {
  const all = await posts();
  const old = all.find((p) => p.id === id);
  if (!old) return null;
  const p = normalizePost(input, old);
  // Slugs follow the title until the post goes live. After that the URL is
  // public and stays put unless the editor changes it on purpose.
  const wantSlug = input.slug ? slugify(input.slug) : !isLive(old) && 'title' in input ? slugify(p.title) : p.slug;
  p.slug = uniqueSlug(all, wantSlug, id);
  p.updatedAt = new Date().toISOString();
  await backend().set('posts', String(id), p);
  return p;
}

export async function deletePost(id) {
  const db = backend();
  if (!(await db.get('posts', String(id)))) return false;
  await db.delete('posts', String(id));
  return true;
}

// ------------------------------------------------------------------ Messages

export async function addMessage({ name, email, topic, message, newsletter }) {
  const m = {
    id: crypto.randomUUID(),
    name: str(name, 200).trim(),
    email: str(email, 320).trim(),
    topic: str(topic, 100).trim(),
    message: str(message, 10000).trim(),
    newsletter: !!newsletter,
    read: false,
    receivedAt: new Date().toISOString(),
  };
  await backend().set('messages', m.id, m);
  return m;
}

export async function allMessages() {
  return (await backend().list('messages')).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export async function markMessageRead(id, read = true) {
  const db = backend();
  const m = await db.get('messages', id);
  if (!m) return null;
  m.read = read;
  await db.set('messages', id, m);
  return m;
}

export async function deleteMessage(id) {
  const db = backend();
  if (!(await db.get('messages', id))) return false;
  await db.delete('messages', id);
  return true;
}

// ------------------------------------------------------------------ Subscribers

// Returns false when the address was already on the list.
export async function addSubscriber(email, source) {
  const e = str(email, 320).trim().toLowerCase();
  const db = backend();
  if (await db.get('subscribers', e)) return false;
  await db.set('subscribers', e, { email: e, source: str(source, 60), subscribedAt: new Date().toISOString() });
  return true;
}

export async function allSubscribers() {
  return (await backend().list('subscribers')).sort((a, b) => b.subscribedAt.localeCompare(a.subscribedAt));
}

export async function deleteSubscriber(email) {
  const db = backend();
  const e = String(email || '').toLowerCase();
  if (!(await db.get('subscribers', e))) return false;
  await db.delete('subscribers', e);
  return true;
}

// ------------------------------------------------------------------ Uploads

export const saveUpload = (name, data, contentType) => backend().putFile(name, data, contentType);
export const getUpload = (name) => backend().getFile(name);

export const isEmail = (s) => typeof s === 'string' && s.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
